"use client";

import type {
  Announcements,
  DndContextProps,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useState,
} from "react";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type { DragEndEvent } from "@dnd-kit/core";

type KanbanItemProps = {
  id: string;
  name: string;
  column: string;
} & Record<string, unknown>;

type KanbanColumnProps = {
  id: string;
  name: string;
} & Record<string, unknown>;

type KanbanContextProps<
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
> = {
  columns: C[];
  data: T[];
  activeCardId: string | null;
};

const KanbanContext = createContext<KanbanContextProps>({
  columns: [],
  data: [],
  activeCardId: null,
});

export type KanbanBoardProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

export const KanbanBoard = ({ id, children, className }: KanbanBoardProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      className={cn(
        "flex size-full min-h-40 flex-col overflow-hidden rounded-xl border border-border/60 bg-secondary text-xs shadow-sm ring-2 transition-all",
        isOver ? "ring-primary" : "ring-transparent",
        className,
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
};

export type KanbanCardProps<T extends KanbanItemProps = KanbanItemProps> = T & {
  children?: ReactNode;
  className?: string;
  onClick?: HTMLAttributes<HTMLDivElement>["onClick"];
};

export const KanbanCard = <T extends KanbanItemProps = KanbanItemProps>({
  id,
  name,
  children,
  className,
  onClick,
}: KanbanCardProps<T>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transition,
    transform,
    isDragging,
  } = useSortable({
    id,
  });
  const { activeCardId } = useContext(KanbanContext) as KanbanContextProps;

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  return (
    <>
      <div
        style={style}
        {...listeners}
        {...attributes}
        onClick={onClick}
        ref={setNodeRef}
      >
        <Card
          className={cn(
            "cursor-grab gap-4 rounded-md p-3 shadow-sm",
            isDragging && "pointer-events-none cursor-grabbing opacity-30",
            className,
          )}
        >
          {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
        </Card>
      </div>
      {/*
        Render the floating drag preview through dnd-kit's own DragOverlay
        rather than a tunnel-rat portal. Only the active card mounts one, so
        there is never more than a single overlay, and there is no
        render-loop-prone tunnel store in the hot path.
      */}
      {activeCardId === id && (
        <DragOverlay dropAnimation={null}>
          <Card
            className={cn(
              "cursor-grabbing gap-4 rounded-md p-3 shadow-sm ring-2 ring-primary",
              className,
            )}
          >
            {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
          </Card>
        </DragOverlay>
      )}
    </>
  );
};

export type KanbanCardsProps<T extends KanbanItemProps = KanbanItemProps> = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "id"
> & {
  children: (item: T) => ReactNode;
  id: string;
  /** Shown, centered and muted, when the column has no cards. */
  empty?: ReactNode;
};

export const KanbanCards = <T extends KanbanItemProps = KanbanItemProps>({
  children,
  className,
  empty,
  ...props
}: KanbanCardsProps<T>) => {
  const { data } = useContext(KanbanContext) as KanbanContextProps<T>;
  const filteredData = data.filter((item) => item.column === props.id);
  const items = filteredData.map((item) => item.id);

  return (
    <ScrollArea className="grow overflow-hidden rounded-t-xl border border-b-0 border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800">
      <SortableContext items={items}>
        <div
          className={cn(
            "flex grow flex-col gap-2 overflow-hidden rounded-t-xl p-2",
            className,
          )}
          {...props}
        >
          {filteredData.length === 0
            ? empty && (
                <div className="flex grow items-center justify-center rounded-md border border-dashed px-2 py-6 text-center text-xs text-muted-foreground">
                  {empty}
                </div>
              )
            : filteredData.map(children)}
        </div>
      </SortableContext>
    </ScrollArea>
  );
};

export type KanbanHeaderProps = HTMLAttributes<HTMLDivElement>;

export const KanbanHeader = ({ className, ...props }: KanbanHeaderProps) => (
  <div className={cn("m-0 p-2 font-semibold text-sm", className)} {...props} />
);

export type KanbanProviderProps<
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
> = Omit<DndContextProps, "children"> & {
  children: (column: C) => ReactNode;
  className?: string;
  columns: C[];
  data: T[];
  onDataChange?: (data: T[]) => void;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
};

export const KanbanProvider = <
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
>({
  children,
  onDragStart,
  onDragEnd,
  onDragOver,
  className,
  columns,
  data,
  onDataChange,
  ...props
}: KanbanProviderProps<T, C>) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const sensors = useSensors(
    // Require a small drag distance so a click on a card isn't read as a drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = data.find((item) => item.id === event.active.id);
    if (card) {
      setActiveCardId(String(event.active.id));
    }
    onDragStart?.(event);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Intentionally do NOT mutate data here. Reordering on every drag-over
    // can make the active card flip under the cursor, retrigger drag-over,
    // and loop until React throws "Maximum update depth exceeded". dnd-kit
    // shifts the surrounding cards visually on its own; the move is committed
    // once on drop in handleDragEnd.
    onDragOver?.(event);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null);

    const { active, over } = event;

    if (over) {
      const activeItem = data.find((item) => item.id === active.id);
      const overItem = data.find((item) => item.id === over.id);
      // Target column: the hovered card's column, or the hovered empty column
      // itself. No columns[0] fallback, so hovering a gap can't relocate cards.
      const overColumn =
        overItem?.column ?? columns.find((col) => col.id === over.id)?.id;

      if (activeItem && overColumn) {
        // Move the card to the target column (new object, never a mutation).
        const moved =
          activeItem.column === overColumn
            ? data
            : data.map((item) =>
                item.id === active.id ? { ...item, column: overColumn } : item,
              );

        const oldIndex = moved.findIndex((item) => item.id === active.id);
        const overIndex = moved.findIndex((item) => item.id === over.id);
        // Dropping onto an empty column: over.id is the column id, so no card
        // matches — place the card at the end of its new column.
        const newIndex = overIndex === -1 ? moved.length - 1 : overIndex;

        if (moved !== data || oldIndex !== newIndex) {
          onDataChange?.(arrayMove(moved, oldIndex, newIndex));
        }
      }
    }

    // Notify the consumer last so it persists the final, settled state.
    onDragEnd?.(event);
  };

  const announcements: Announcements = {
    onDragStart({ active }) {
      const { name, column } = data.find((item) => item.id === active.id) ?? {};

      return `Picked up the card "${name}" from the "${column}" column`;
    },
    onDragOver({ active, over }) {
      const { name } = data.find((item) => item.id === active.id) ?? {};
      const newColumn = columns.find((column) => column.id === over?.id)?.name;

      return `Dragged the card "${name}" over the "${newColumn}" column`;
    },
    onDragEnd({ active, over }) {
      const { name } = data.find((item) => item.id === active.id) ?? {};
      const newColumn = columns.find((column) => column.id === over?.id)?.name;

      return `Dropped the card "${name}" into the "${newColumn}" column`;
    },
    onDragCancel({ active }) {
      const { name } = data.find((item) => item.id === active.id) ?? {};

      return `Cancelled dragging the card "${name}"`;
    },
  };

  return (
    <KanbanContext.Provider value={{ columns, data, activeCardId }}>
      <DndContext
        // Stable id keeps dnd-kit's generated aria ids identical on the
        // server and client, avoiding a hydration mismatch.
        id="kanban"
        accessibility={{ announcements }}
        // closestCorners targets columns (incl. empty ones) more reliably
        // than closestCenter for a multi-column board.
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
        {...props}
      >
        <div
          className={cn(
            "grid size-full auto-cols-fr grid-flow-col gap-4",
            className,
          )}
        >
          {columns.map((column) => children(column))}
        </div>
        {/* The drag preview is rendered by the active KanbanCard via its own
            DragOverlay, so no shared portal/tunnel is needed here. */}
      </DndContext>
    </KanbanContext.Provider>
  );
};
