/**
 * Plugin Vite - Inspector API
 * Expose un endpoint pour récupérer le code source d'un fichier
 */

import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface SourceResponse {
  success: boolean;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  context?: {
    before: string[];
    target: string;
    after: string[];
  };
  component?: string;
  error?: string;
}

export function inspectorApiPlugin(): Plugin {
  let projectRoot = '';

  return {
    name: 'vite-plugin-inspector-api',

    configResolved(config) {
      projectRoot = config.root;
    },

    configureServer(server) {
      // Endpoint pour récupérer le code source
      server.middlewares.use('/__inspector/source', (req, res) => {
        // Headers CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const filePath = url.searchParams.get('file');
        const line = parseInt(url.searchParams.get('line') || '0');
        const contextLines = parseInt(url.searchParams.get('context') || '5');

        if (!filePath) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'Missing file parameter' }));
          return;
        }

        try {
          // Résoudre le chemin du fichier
          let absolutePath = filePath;
          if (!path.isAbsolute(filePath)) {
            absolutePath = path.resolve(projectRoot, filePath);
          }

          // Normaliser les chemins pour la comparaison (gérer les différences de slashes)
          const normalizedAbsPath = path.normalize(absolutePath).toLowerCase();
          const normalizedRoot = path.normalize(projectRoot).toLowerCase();

          // Vérifier que le fichier est dans le projet (sécurité)
          if (!normalizedAbsPath.startsWith(normalizedRoot)) {
            console.log('[Inspector API] Access denied:', { absolutePath, projectRoot, normalizedAbsPath, normalizedRoot });
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Access denied - file outside project' }));
            return;
          }

          if (!fs.existsSync(absolutePath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'File not found' }));
            return;
          }

          const content = fs.readFileSync(absolutePath, 'utf-8');
          const lines = content.split('\n');

          // Extraire le contexte autour de la ligne
          const targetIndex = line - 1; // Les lignes commencent à 1
          const startIndex = Math.max(0, targetIndex - contextLines);
          const endIndex = Math.min(lines.length - 1, targetIndex + contextLines);

          const response: SourceResponse = {
            success: true,
            file: filePath,
            line: line,
            code: content,
            context: {
              before: lines.slice(startIndex, targetIndex),
              target: lines[targetIndex] || '',
              after: lines.slice(targetIndex + 1, endIndex + 1),
            },
          };

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(response));

        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });

      // Endpoint pour vérifier que l'API est disponible
      server.middlewares.use('/__inspector/ping', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          available: true,
          version: '1.0.0',
          features: ['source', 'context']
        }));
      });

      console.log('[Inspector API] Endpoints disponibles:');
      console.log('  - /__inspector/ping');
      console.log('  - /__inspector/source?file=<path>&line=<n>&context=<n>');
    }
  };
}
