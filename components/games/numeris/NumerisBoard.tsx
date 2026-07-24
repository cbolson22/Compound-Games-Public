"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fmtTime } from "@/lib/format";
import { saveResult, getResult, computeStreak } from "@/lib/localStorage";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useNumeris, isSym, type TileData, type Puzzle } from "./useNumeris";
import Tile from "./Tile";
import styles from "./numeris.module.css";

function TrayArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "tray" });
  return (
    <div
      ref={setNodeRef}
      className={[styles.tray, isOver ? styles.dragOver : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

function DraggableTrayTile({
  tile,
  isUsed,
  onClick,
}: {
  tile: TileData;
  isUsed: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tray-${tile.id}`,
    disabled: isUsed,
  });
  return (
    <Tile
      ref={setNodeRef}
      val={tile.val}
      used={isUsed}
      dragging={isDragging}
      onClick={isUsed ? undefined : onClick}
      {...listeners}
      {...attributes}
    />
  );
}

function SlotCell({
  slotIndex,
  val,
  solved,
  onReturn,
}: {
  slotIndex: number;
  val: string | null;
  solved: boolean;
  onReturn: () => void;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `slot-${slotIndex}`,
  });
  const {
    setNodeRef: setDragRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id: `slot-${slotIndex}`,
    disabled: val === null || solved,
  });

  const filled = val !== null;
  const classes = [
    styles.slot,
    filled ? styles.filled : "",
    filled && isSym(val!) ? styles.symFilled : "",
    isOver && !isDragging ? styles.dragOver : "",
    isDragging ? styles.slotDragging : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={(node: HTMLElement | null) => {
        setDropRef(node);
        setDragRef(node);
      }}
      className={classes}
      onClick={filled && !solved ? onReturn : undefined}
      {...attributes}
      {...(filled && !solved ? listeners : {})}
    >
      {val}
      {filled && <span className={styles.rx}>✕</span>}
    </div>
  );
}

export default function NumerisBoard({
  puzzle,
  puzzleId,
  puzzleDate,
  puzzleNumber,
}: {
  puzzle: Puzzle;
  puzzleId: string | null;
  puzzleDate: string;
  puzzleNumber: number;
}) {
  const [{ savedResult, alreadyPlayed, streak }] = useState(() => {
    const result = getResult("numeris", puzzleDate)
    return {
      savedResult: result,
      alreadyPlayed: result !== null,
      streak: result !== null ? computeStreak("numeris", puzzleDate) : 0,
    }
  })
  const solveSubmitted = useRef(false);

  const [{ savedElapsed, savedSlots }] = useState(() => {
    if (alreadyPlayed || !puzzleId)
      return { savedElapsed: 0, savedSlots: undefined as (string | null)[] | undefined };
    try {
      const raw = localStorage.getItem(`numeris-${puzzleId}`);
      if (!raw) return { savedElapsed: 0, savedSlots: undefined };
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        const slots =
          Array.isArray(parsed.slots) && parsed.slots.length === puzzle.slots
            ? (parsed.slots as (string | null)[])
            : undefined;
        return { savedElapsed: parsed.elapsed ?? 0, savedSlots: slots };
      }
      return { savedElapsed: parseInt(raw, 10) || 0, savedSlots: undefined };
    } catch {
      return { savedElapsed: 0, savedSlots: undefined };
    }
  });

  const {
    tiles,
    slotContents,
    usedIndices,
    solved,
    elapsed,
    currentResult,
    allFilled,
    target,
    placeTile,
    swapSlots,
    returnSlot,
    clearBoard,
  } = useNumeris(puzzle, {
    initialElapsed: savedElapsed,
    paused: alreadyPlayed,
    initialSlots: savedSlots,
  });

  const [copied, setCopied] = useState(false);

  // Persist in-progress state
  useEffect(() => {
    if (!puzzleId || alreadyPlayed) return;
    localStorage.setItem(
      `numeris-${puzzleId}`,
      JSON.stringify({ elapsed, slots: slotContents }),
    );
  }, [elapsed, slotContents, puzzleId, alreadyPlayed]);

  // Save result on solve
  useEffect(() => {
    if (!solved || alreadyPlayed || solveSubmitted.current) return;
    solveSubmitted.current = true;
    if (puzzleId) localStorage.removeItem(`numeris-${puzzleId}`);
    const share = `Compound Games – Numeris #${puzzleNumber}\n⏱ ${fmtTime(elapsed)}\ncompound-games.com`;
    saveResult("numeris", puzzleDate, {
      time_seconds: elapsed,
      score: null,
      completed_at: new Date().toISOString(),
      share,
    });
  }, [solved, elapsed, puzzleDate, puzzleNumber, puzzleId, alreadyPlayed]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setActiveId(null);
      if (!over) return;
      const aid = active.id as string;
      const oid = over.id as string;

      if (aid.startsWith("tray-")) {
        if (oid.startsWith("slot-")) {
          placeTile(parseInt(aid.slice(5)), parseInt(oid.slice(5)));
        }
      } else if (aid.startsWith("slot-")) {
        const fromSlot = parseInt(aid.slice(5));
        if (oid.startsWith("slot-")) {
          const toSlot = parseInt(oid.slice(5));
          if (fromSlot !== toSlot) swapSlots(fromSlot, toSlot);
        } else if (oid === "tray") {
          returnSlot(fromSlot);
        }
      }
    },
    [placeTile, swapSlots, returnSlot],
  );

  const handleTileClick = useCallback(
    (tileId: number) => {
      if (solved) return;
      const firstEmpty = slotContents.findIndex((s) => s === null);
      if (firstEmpty !== -1) placeTile(tileId, firstEmpty);
    },
    [solved, slotContents, placeTile],
  );

  const activeTileVal = (() => {
    if (!activeId) return null;
    if (activeId.startsWith("tray-")) {
      return tiles.find((t) => t.id === parseInt(activeId.slice(5)))?.val ?? null;
    }
    if (activeId.startsWith("slot-")) {
      return slotContents[parseInt(activeId.slice(5))];
    }
    return null;
  })();

  const resultClass = [
    styles.resultBox,
    currentResult === null
      ? ""
      : currentResult === target
        ? styles.match
        : allFilled
          ? styles.nomatch
          : "",
  ]
    .filter(Boolean)
    .join(" ");

  const displayTime = alreadyPlayed ? (savedResult?.time_seconds ?? 0) : elapsed;
  const isDone = solved || alreadyPlayed;
  const shareText = alreadyPlayed
    ? savedResult?.share
    : `Compound Games – Numeris #${puzzleNumber}\n⏱ ${fmtTime(elapsed)}\ncompound-games.com`;

  const handleShare = () => {
    navigator.clipboard.writeText(shareText ?? "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.nr}>
        <div className={styles.gTitle}>Numeris</div>
        <div className={styles.gSub}>Puzzle #{puzzleNumber}</div>

        <div className={styles.timerWrap}>
          <div className={styles.timerLbl}>Time</div>
          <div
            className={[styles.timer, isDone ? styles.solved : ""]
              .filter(Boolean)
              .join(" ")}
          >
            {fmtTime(displayTime)}
          </div>
        </div>

        <div className={styles.targetWrap}>
          <div className={styles.targetLbl}>Target</div>
          <div className={styles.targetNum}>{target}</div>
        </div>

        <div className={styles.eqArea}>
          <div className={styles.slotsRow}>
            {slotContents.map((val, si) => (
              <SlotCell
                key={si}
                slotIndex={si}
                val={val}
                solved={isDone}
                onReturn={() => returnSlot(si)}
              />
            ))}
          </div>
          <div className={styles.eqSuffix}>
            <div className={styles.eqSep}>=</div>
            <div className={resultClass}>
              {currentResult === null ? "?" : currentResult}
            </div>
          </div>
        </div>

        {!isDone && (
          <>
            <div className={styles.tilesLbl}>Your tiles</div>
            <TrayArea>
              {tiles.map((t) => (
                <DraggableTrayTile
                  key={t.id}
                  tile={t}
                  isUsed={usedIndices.has(t.id)}
                  onClick={() => handleTileClick(t.id)}
                />
              ))}
            </TrayArea>

            <div className={styles.controls}>
              <button className={styles.btn} onClick={clearBoard}>
                Clear
              </button>
            </div>
          </>
        )}

        {isDone && (
          <div className={[styles.solvedBanner, styles.show].join(" ")}>
            <div className={styles.solvedTxt}>Solved!</div>
            <div className={styles.solvedSub}>
              Completed in {fmtTime(displayTime)}
            </div>
            {streak > 0 && <div className={styles.solvedSub}>{streak}🔥</div>}
            <button
              onClick={handleShare}
              className="mt-3 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1a1a] text-white hover:bg-[#333] transition-colors"
            >
              {copied ? "Copied!" : "Share result"}
            </button>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTileVal != null ? <Tile val={activeTileVal} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
