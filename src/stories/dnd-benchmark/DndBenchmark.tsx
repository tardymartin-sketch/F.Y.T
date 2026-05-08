import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Type, Dumbbell } from 'lucide-react';

type Item = {
  id: string;
  type: 'exercise' | 'text';
  content: string;
};

const initialItems: Item[] = [
  { id: '1', type: 'exercise', content: 'Squat' },
  { id: '2', type: 'text', content: 'Garder le dos droit !' },
  { id: '3', type: 'exercise', content: 'Développé Couché' },
  { id: '4', type: 'text', content: 'Ne pas oublier de respirer' },
  { id: '5', type: 'exercise', content: 'Soulevé de terre' },
];

const SortableItem = ({ item }: { item: Item }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 mb-2 bg-white rounded-lg border border-slate-200 shadow-sm"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-blue-500 text-slate-400 p-1 -ml-2"
      >
        <GripVertical size={20} />
      </div>
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600">
        {item.type === 'exercise' ? <Dumbbell size={16} /> : <Type size={16} />}
      </div>
      <div className="font-medium text-slate-700">
        {item.content} <span className="text-xs text-slate-400 font-normal ml-2">({item.type})</span>
      </div>
    </div>
  );
};

export const DndKitExample = () => {
  const [items, setItems] = useState<Item[]>(initialItems);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-slate-50 rounded-xl">
      <h3 className="text-lg font-bold mb-4 text-slate-800">dnd-kit (Moderne)</h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItem key={item.id} item={item} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export const HelloPangeaExample = () => {
  const [items, setItems] = useState<Item[]>(initialItems);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    setItems(reorderedItems);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-slate-50 rounded-xl">
      <h3 className="text-lg font-bold mb-4 text-slate-800">@hello-pangea/dnd (Classique)</h3>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided: any) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided: any, snapshot: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center gap-3 p-4 mb-2 bg-white rounded-lg border border-slate-200 ${
                        snapshot.isDragging ? 'shadow-md ring-2 ring-blue-500/20' : 'shadow-sm'
                      }`}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-grab hover:text-blue-500 text-slate-400 p-1 -ml-2"
                      >
                        <GripVertical size={20} />
                      </div>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600">
                        {item.type === 'exercise' ? <Dumbbell size={16} /> : <Type size={16} />}
                      </div>
                      <div className="font-medium text-slate-700">
                        {item.content} <span className="text-xs text-slate-400 font-normal ml-2">({item.type})</span>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export const DndBenchmark = () => {
  return (
    <div className="flex flex-col md:flex-row gap-8 justify-center items-start w-full">
      <div className="w-full md:w-1/2">
        <DndKitExample />
        <div className="mt-4 text-sm text-slate-500 max-w-md mx-auto">
          <strong>Avantages dnd-kit :</strong> Accessible, léger, très performant, modulable, supporte facilement de multiples listes, DOM très propre (pas de wrappers inutiles).
        </div>
      </div>
      <div className="w-full md:w-1/2">
        <HelloPangeaExample />
        <div className="mt-4 text-sm text-slate-500 max-w-md mx-auto">
          <strong>Avantages @hello-pangea/dnd :</strong> Fork de react-beautiful-dnd, API très connue, gère très bien les animations par défaut, "feel" très naturel, mais vieillissant sur son architecture.
        </div>
      </div>
    </div>
  );
};
