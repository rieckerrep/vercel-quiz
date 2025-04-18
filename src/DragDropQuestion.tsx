import { useState, useEffect, useRef } from "react";
import { useDrag, useDrop, DndProvider, ConnectDragSource, ConnectDropTarget } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { supabase } from "./lib/supabaseClient";
import { motion } from "framer-motion";
import { useQuizStore } from "./store/useQuizStore";

// Typdefinition für ein Drag-Drop-Paar (aus der Tabelle "dragdrop_pairs")
export interface DragPair {
  id: number;
  drag_text: string;
  correct_match: string;
  group_id: number;
}

// Typdefinition für eine Gruppe (aus "dragdrop_groups")
interface DragGroup {
  id: number;
  question_id: number;
}

// Props für DragDropQuestion
interface DragDropQuestionProps {
  questionId: number;
  onComplete: (overallCorrect: boolean) => void;
}

const DRAG_ITEM_TYPE = "DRAG_ITEM";

// DraggableItem-Komponente: Ein einzelnes, ziehbares Element
interface DraggableItemProps {
  pair: DragPair;
  isDropped: boolean;
}
const DraggableItem: React.FC<DraggableItemProps> = ({ pair, isDropped }) => {
  const [{ opacity, isDragging }, drag] = useDrag(
    () => ({
      type: DRAG_ITEM_TYPE,
      item: { id: pair.id },
      collect: (monitor) => ({
        opacity: monitor.isDragging() ? 0.4 : 1,
        isDragging: monitor.isDragging(),
      }),
      canDrag: !isDropped,
    }),
    [pair, isDropped]
  );

  return (
    <div ref={drag as unknown as React.Ref<HTMLDivElement>}>
      <motion.div
        className={`
          p-3 md:p-3 rounded-md shadow-sm mb-3 select-none
          ${isDropped ? 'bg-gray-200 text-gray-500' : 'bg-white border-2 border-gray-300 hover:border-black'}
          ${!isDropped && 'cursor-move hover:shadow-md'}
          ${isDragging ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
          transition-all duration-200
        `}
        style={{ 
          opacity,
          transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        }}
        initial={{ scale: 1 }}
        whileHover={{ scale: isDropped ? 1 : 1.02 }}
        whileTap={{ scale: isDropped ? 1 : 0.98 }}
      >
        <div className="flex items-center min-h-[2.5rem]">
          {!isDropped && (
            <div className="flex-shrink-0 mr-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          )}
          <div className="text-base font-medium">{pair.drag_text}</div>
        </div>
      </motion.div>
    </div>
  );
};

// DropTarget-Komponente: Bereich, in den Items abgelegt werden können
interface DropTargetProps {
  pair: DragPair;
  onDrop: (draggedId: number, targetId: number) => void;
  isMatched: boolean | undefined;
}
const DropTarget: React.FC<DropTargetProps> = ({ pair, onDrop, isMatched }) => {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: DRAG_ITEM_TYPE,
      canDrop: () => isMatched === undefined, // Verhindert Drop wenn bereits beantwortet
      drop: (dragged: { id: number }) => {
        onDrop(dragged.id, pair.id);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [pair, onDrop, isMatched] // isMatched zur Dependency-Liste hinzugefügt
  );

  const isActive = isOver && canDrop;

  // Klassen basierend auf dem Status
  const targetClasses = [
    'p-3 rounded-md mb-3 transition-all duration-200 shadow-sm border-2',
    isMatched === true ? 'bg-green-50 border-green-500 text-green-800' : 
    isMatched === false ? 'bg-red-50 border-red-500 text-red-800' : 
    isActive ? 'bg-blue-50 border-blue-500 border-dashed ring-2 ring-blue-500 ring-opacity-50' :
    isOver ? 'bg-gray-100 border-black border-dashed' : 
    isMatched !== undefined ? 'bg-gray-100 border-gray-300 cursor-not-allowed' :
    'bg-white border-gray-300 border-dashed'
  ].join(' ');

  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>}>
      <motion.div
        className={targetClasses}
        initial={{ scale: 1 }}
        animate={{ 
          scale: isActive ? 1.02 : 1,
          boxShadow: isActive ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="flex items-center min-h-[2.5rem]">
          <div className="flex-grow font-medium text-base">{pair.correct_match}</div>
          {isMatched === true && (
            <div className="flex-shrink-0 text-green-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {isMatched === false && (
            <div className="flex-shrink-0 text-red-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default function DragDropQuestion({
  questionId,
  onComplete
}: DragDropQuestionProps) {
  const [group, setGroup] = useState<DragGroup | null>(null);
  const [pairs, setPairs] = useState<DragPair[]>([]);
  const [shuffledPairs, setShuffledPairs] = useState<DragPair[]>([]);
  const [matched, setMatched] = useState<Record<number, boolean>>({});
  const [droppedItems, setDroppedItems] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Gruppe laden
  useEffect(() => {
    async function loadGroup() {
      setLoading(true);
      const { data, error } = await supabase
        .from("dragdrop_groups")
        .select("*")
        .eq("question_id", questionId)
        .single();
      if (error) {
        console.error("Fehler beim Laden der DragDrop-Gruppe:", error);
      } else {
        setGroup(data);
      }
    }
    loadGroup();
  }, [questionId]);

  // Paare laden, sobald die Gruppe verfügbar ist
  useEffect(() => {
    async function loadPairs() {
      if (!group) return;
      const { data: pairs, error } = await supabase
        .from('dragdrop_pairs')
        .select('*')
        .eq('group_id', group.id);

      if (error) {
        console.error('Fehler beim Laden der Paare:', error);
        return;
      }

      if (pairs) {
        // Filtere null-Werte heraus und konvertiere zu DragPair
        const validPairs = pairs
          .filter(pair => pair.drag_text !== null && pair.correct_match !== null)
          .map(pair => ({
            id: pair.id,
            drag_text: pair.drag_text as string,
            correct_match: pair.correct_match as string,
            group_id: pair.group_id
          }));
        
        setPairs(validPairs);
      }
      setLoading(false);
    }
    loadPairs();
  }, [group]);

  // Shuffeln der Paare
  useEffect(() => {
    if (pairs.length > 0) {
      const items = [...pairs];
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      setShuffledPairs(items);
    }
  }, [pairs]);

  // Wenn ein Item gedroppt wird
  const handleDrop = (draggedId: number, targetId: number) => {
    setDroppedItems((prev) => ({ ...prev, [draggedId]: true }));
    const isMatch = draggedId === targetId;
    setMatched((prev) => ({ ...prev, [targetId]: isMatch }));
  };

  // Automatische Überprüfung, wenn alle Ziele beantwortet sind
  useEffect(() => {
    if (pairs.length === 0) return;
    const allAnswered = pairs.every((pair) => matched[pair.id] !== undefined);
    if (allAnswered && !hasCompletedRef.current) {
      const overallCorrect = pairs.every((pair) => matched[pair.id] === true);
      
      // Formatiere die richtige Antwort für die Anzeige
      const correctAnswer = pairs
        .map(pair => `${pair.drag_text} → ${pair.correct_match}`)
        .join('\n');

      // Speichere die richtige Antwort im Store und rufe onComplete auf
      const timer = setTimeout(() => {
        // Setze die Antwort und rufe dann onComplete auf
        useQuizStore.setState({ correctDragDropAnswer: correctAnswer });
        hasCompletedRef.current = true;
        onComplete(overallCorrect);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [matched, pairs, onComplete]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-800 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Drag & Drop wird geladen...</p>
        </div>
      </div>
    );
  }

  const touchBackendOptions = {
    enableMouseEvents: true,
    enableTouchEvents: true,
    delayTouchStart: 50,
    touchSlop: 20
  };

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend} options={isMobile ? touchBackendOptions : undefined}>
      <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8">
        {/* Linke Spalte: Draggable Items */}
        <motion.div 
          className="bg-gray-50 p-4 md:p-5 rounded-xl md:rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="mb-6 md:mb-4 text-2xl md:text-xl font-semibold text-gray-800">Begriffe</h3>
          {shuffledPairs.map((pair) => (
            <DraggableItem
              key={pair.id}
              pair={pair}
              isDropped={!!droppedItems[pair.id]}
            />
          ))}
        </motion.div>
        
        {/* Rechte Spalte: Drop Targets */}
        <motion.div 
          className="bg-gray-50 p-4 md:p-5 rounded-xl md:rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h3 className="mb-6 md:mb-4 text-2xl md:text-xl font-semibold text-gray-800">Zuordnung</h3>
          {pairs.map((pair) => (
            <DropTarget
              key={pair.id}
              pair={pair}
              onDrop={handleDrop}
              isMatched={matched[pair.id]}
            />
          ))}
        </motion.div>
      </div>
    </DndProvider>
  );
}
