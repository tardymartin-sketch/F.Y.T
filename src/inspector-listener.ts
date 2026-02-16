/**
 * Inspector Listener
 * Script qui écoute les requêtes de l'extension Chrome Dev Inspector
 * et récupère les informations de code source via l'API Vite
 */

// Éviter double initialisation
if (!(window as any).__INSPECTOR_LISTENER_LOADED__) {
  (window as any).__INSPECTOR_LISTENER_LOADED__ = true;

  const INSPECTOR_API_BASE = `${window.location.protocol}//${window.location.host}/__inspector`;

  // Vérifier si l'API est disponible
  const checkApiAvailability = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${INSPECTOR_API_BASE}/ping`);
      const data = await response.json();
      return data.available === true;
    } catch {
      return false;
    }
  };

  // Récupérer le code source d'un fichier
  const fetchSourceCode = async (
    file: string,
    line: number,
    contextLines: number = 5
  ): Promise<any> => {
    try {
      const params = new URLSearchParams({
        file,
        line: String(line),
        context: String(contextLines),
      });
      const response = await fetch(`${INSPECTOR_API_BASE}/source?${params}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  };

  // Trouver les infos d'inspection sur un élément (attributs data-inspector-*)
  const findInspectorData = (element: HTMLElement): {
    file: string | null;
    line: number | null;
    column: number | null;
  } => {
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      const file = current.getAttribute('data-inspector-relative-path');
      const line = current.getAttribute('data-inspector-line');
      const column = current.getAttribute('data-inspector-column');

      if (file && line) {
        return {
          file: file.replace(/\\\\/g, '/'),
          line: parseInt(line),
          column: parseInt(column || '0'),
        };
      }
      current = current.parentElement;
    }

    return { file: null, line: null, column: null };
  };

  // Trouver les composants React parents
  const findReactComponents = (element: HTMLElement): string[] => {
    const components: string[] = [];
    const fiberKey = Object.keys(element).find(key => key.startsWith('__reactFiber$'));

    if (!fiberKey) return components;

    let fiber = (element as any)[fiberKey];
    let depth = 0;

    while (fiber && depth < 15) {
      if (fiber.type && typeof fiber.type === 'function') {
        const name = fiber.type.displayName || fiber.type.name;
        if (name && name !== 'Anonymous') {
          components.push(name);
        }
      }
      fiber = fiber.return;
      depth++;
    }

    return components;
  };

  // Clés de props métier intéressantes à capturer
  const BUSINESS_PROP_KEYS = [
    // Identifiants
    'id', 'key', 'name', 'slug', 'code',
    // Titres / Labels
    'title', 'label', 'text', 'placeholder', 'alt',
    // États
    'status', 'state', 'type', 'variant', 'mode', 'level',
    // Valeurs
    'value', 'defaultValue', 'checked', 'selected', 'disabled', 'active', 'open', 'visible',
    // Dates
    'date', 'startDate', 'endDate', 'createdAt', 'updatedAt',
    // Données métier F.Y.T
    'sessionId', 'exerciseId', 'workoutId', 'programId', 'userId',
    'exerciseName', 'sessionName', 'programName',
    'sets', 'reps', 'weight', 'duration', 'rest',
    'isCompleted', 'isActive', 'isSelected', 'isEditing',
    'count', 'total', 'index', 'position', 'order',
  ];

  // Extraire une valeur de prop de manière sécurisée
  const extractPropValue = (value: any, depth: number = 0): any => {
    if (depth > 2) return '[Deep Object]';
    if (value === null || value === undefined) return value;
    if (typeof value === 'function') return '[Function]';
    if (typeof value === 'symbol') return '[Symbol]';

    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      if (value.length > 5) return `[Array(${value.length})]`;
      return value.map(v => extractPropValue(v, depth + 1));
    }

    if (typeof value === 'object') {
      // Vérifier si c'est un React element
      if (value.$$typeof) return '[React Element]';

      // Extraire les propriétés simples des objets
      const extracted: Record<string, any> = {};
      const entries = Object.entries(value);
      if (entries.length > 10) return `[Object(${entries.length} keys)]`;

      for (const [k, v] of entries.slice(0, 10)) {
        if (typeof v !== 'function' && typeof v !== 'symbol') {
          extracted[k] = extractPropValue(v, depth + 1);
        }
      }
      return extracted;
    }

    return value;
  };

  // Extraire les props React intéressantes de l'élément ET de ses parents
  const extractReactProps = (element: HTMLElement): Record<string, any> => {
    const props: Record<string, any> = {};
    const fiberKey = Object.keys(element).find(key => key.startsWith('__reactFiber$'));
    if (!fiberKey) return props;

    let fiber = (element as any)[fiberKey];
    let depth = 0;
    const skipKeys = new Set(['children', 'ref', 'key', 'style', 'className']);
    const seenProps = new Set<string>();

    // Remonter l'arbre des fibres React pour trouver des props intéressantes
    while (fiber && depth < 10) {
      const memoizedProps = fiber.memoizedProps;

      if (memoizedProps && typeof memoizedProps === 'object') {
        for (const [key, value] of Object.entries(memoizedProps)) {
          // Ignorer les props déjà vues ou à ignorer
          if (skipKeys.has(key)) continue;
          if (key.startsWith('data-inspector')) continue;
          if (key.startsWith('on')) continue; // event handlers
          if (seenProps.has(key)) continue;

          // Toujours inclure les clés métier importantes
          const isBusinessKey = BUSINESS_PROP_KEYS.some(bk =>
            key.toLowerCase().includes(bk.toLowerCase())
          );

          // Inclure si c'est une clé métier OU une valeur primitive sur l'élément direct
          if (isBusinessKey || (depth === 0 && typeof value !== 'function' && typeof value !== 'object')) {
            const extracted = extractPropValue(value);
            if (extracted !== undefined && extracted !== '[Function]') {
              props[key] = extracted;
              seenProps.add(key);
            }
          }
        }
      }

      // Chercher aussi dans les props du composant parent
      fiber = fiber.return;
      depth++;
    }

    return props;
  };

  // Récupérer des infos contextuelles supplémentaires (data-* attributes)
  const extractDataAttributes = (element: HTMLElement): Record<string, string> => {
    const data: Record<string, string> = {};
    let current: HTMLElement | null = element;
    let depth = 0;

    while (current && current !== document.body && depth < 5) {
      for (const attr of Array.from(current.attributes)) {
        if (attr.name.startsWith('data-') && !attr.name.startsWith('data-inspector')) {
          const key = attr.name.replace('data-', '');
          if (!data[key]) {
            data[key] = attr.value;
          }
        }
      }
      current = current.parentElement;
      depth++;
    }

    return data;
  };

  // Construire un résumé contextuel pour aider à comprendre l'élément
  const buildContextSummary = (
    element: HTMLElement,
    components: string[],
    props: Record<string, any>
  ): string => {
    const parts: string[] = [];

    // Composant principal
    if (components.length > 0) {
      parts.push(`Composant: ${components[0]}`);
    }

    // Normaliser les clés de props pour la recherche
    const propsEntries = Object.entries(props);
    const findProp = (patterns: string[]): [string, any] | undefined => {
      for (const [key, value] of propsEntries) {
        const keyLower = key.toLowerCase().replace(/\s/g, '');
        if (patterns.some(p => keyLower.includes(p.toLowerCase()))) {
          return [key, value];
        }
      }
      return undefined;
    };

    // Identifier le type d'élément basé sur les props et composants
    const componentName = components[0]?.toLowerCase() || '';

    // Détecter le contexte métier F.Y.T
    if (componentName.includes('session') || findProp(['session'])) {
      const sessionProp = findProp(['sessionName', 'sessionname']) || findProp(['name', 'title']);
      if (sessionProp && typeof sessionProp[1] === 'string') {
        parts.push(`Session: "${sessionProp[1]}"`);
      }
    }

    if (componentName.includes('exercise') || findProp(['exercise'])) {
      const exerciseProp = findProp(['exerciseName', 'exercisename']) || findProp(['name', 'title']);
      if (exerciseProp && typeof exerciseProp[1] === 'string') {
        parts.push(`Exercice: "${exerciseProp[1]}"`);
      }
    }

    if (componentName.includes('workout') || findProp(['workout'])) {
      parts.push('Élément de workout');
    }

    // Ajouter les props booléennes importantes avec leur valeur
    const booleanProps: string[] = [];
    for (const [key, value] of propsEntries) {
      if (typeof value === 'boolean') {
        const keyClean = key.replace(/\s/g, '');
        // Ignorer les props génériques peu informatives
        if (['disabled', 'hidden', 'visible'].includes(keyClean.toLowerCase())) continue;
        booleanProps.push(`${keyClean}: ${value}`);
      }
    }
    if (booleanProps.length > 0 && booleanProps.length <= 3) {
      parts.push(booleanProps.join(', '));
    }

    // Ajouter l'état si disponible (string)
    const statusProp = findProp(['status', 'state', 'variant', 'mode']);
    if (statusProp && typeof statusProp[1] === 'string') {
      parts.push(`État: ${statusProp[1]}`);
    }

    // Ajouter des infos de position/index si disponibles
    const indexProp = findProp(['index', 'position', 'order']);
    if (indexProp && typeof indexProp[1] === 'number') {
      parts.push(`Position: ${indexProp[1]}`);
    }

    // Ajouter des compteurs intéressants
    const countProp = findProp(['count', 'total', 'length', 'size']);
    if (countProp && typeof countProp[1] === 'number') {
      parts.push(`${countProp[0]}: ${countProp[1]}`);
    }

    // Si on n'a trouvé que le composant, ajouter un aperçu des props disponibles
    if (parts.length === 1 && propsEntries.length > 0) {
      const propKeys = propsEntries
        .filter(([_, v]) => typeof v !== 'object' || v === null)
        .map(([k]) => k)
        .slice(0, 3);
      if (propKeys.length > 0) {
        parts.push(`Props: ${propKeys.join(', ')}`);
      }
    }

    return parts.join(' | ') || 'Élément UI';
  };

  // Handler pour les messages de l'extension
  const handleExtensionMessage = async (event: MessageEvent) => {
    // Vérifier que le message vient de notre extension
    if (event.source !== window) return;
    if (!event.data || event.data.type !== 'DEV_INSPECTOR_REQUEST') return;

    const { action, payload, requestId } = event.data;

    let response: any = { requestId, success: false };

    try {
      switch (action) {
        case 'ping': {
          const apiAvailable = await checkApiAvailability();
          response = {
            requestId,
            success: true,
            data: {
              listenerActive: true,
              apiAvailable,
              features: ['source', 'react-components', 'react-props'],
            },
          };
          break;
        }

        case 'get-element-info': {
          const { x, y } = payload;
          const element = document.elementFromPoint(x, y) as HTMLElement;

          if (!element) {
            response = { requestId, success: false, error: 'No element at position' };
            break;
          }

          // Récupérer les infos d'inspection
          const inspectorData = findInspectorData(element);
          const components = findReactComponents(element);
          const reactProps = extractReactProps(element);
          const dataAttributes = extractDataAttributes(element);

          // Fusionner les props React et les data-* attributes
          const allProps: Record<string, any> = { ...dataAttributes };

          // Ajouter les props React (plus prioritaires)
          for (const [key, value] of Object.entries(reactProps)) {
            // Formatter les clés en camelCase lisible
            const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
            allProps[formattedKey] = value;
          }

          // Si on a un fichier, récupérer le code source
          let sourceData = null;
          if (inspectorData.file && inspectorData.line !== null && inspectorData.line > 0) {
            console.log('[Inspector Listener] Fetching source for:', inspectorData.file, 'line:', inspectorData.line);
            sourceData = await fetchSourceCode(inspectorData.file, inspectorData.line, 8);
            console.log('[Inspector Listener] Source fetch result:', JSON.stringify(sourceData, null, 2));
          } else {
            console.log('[Inspector Listener] No source info available:', inspectorData);
          }

          // Construire un résumé contextuel
          const contextSummary = buildContextSummary(element, components, allProps);

          response = {
            requestId,
            success: true,
            data: {
              // Infos DOM
              tagName: element.tagName.toLowerCase(),
              id: element.id || null,
              className: element.className || null,
              textContent: (element.innerText || element.textContent || '').substring(0, 100).trim(),

              // Infos React
              components,
              props: allProps,

              // Résumé contextuel
              context: contextSummary,

              // Infos source
              file: inspectorData.file,
              line: inspectorData.line,
              column: inspectorData.column,

              // Code source
              source: sourceData?.success ? sourceData : null,
            },
          };
          break;
        }

        case 'get-source': {
          const { file, line, context } = payload;
          const sourceData = await fetchSourceCode(file, line, context || 5);
          response = {
            requestId,
            success: sourceData.success,
            data: sourceData,
          };
          break;
        }

        default:
          response = { requestId, success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      response = {
        requestId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Envoyer la réponse à l'extension
    window.postMessage({ type: 'DEV_INSPECTOR_RESPONSE', ...response }, '*');
  };

  // Écouter les messages
  window.addEventListener('message', handleExtensionMessage);

  // Signaler que le listener est prêt
  window.postMessage({
    type: 'DEV_INSPECTOR_READY',
    features: ['source', 'react-components', 'react-props'],
  }, '*');

  console.log('[Inspector Listener] Prêt - En attente des requêtes de l\'extension');
}

export {};
