import React, { useCallback, useContext, useEffect } from 'react';
import { DragObjectWithType, DragSourceMonitor, useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { ExcludeKeys, Nilable, Nullable } from 'tsdef';

import { FileData } from '../../typedef';
import { ChonkyDispatchSpecialActionContext } from '../../util/context';
import { FileHelper } from '../../util/file-helper';
import { SpecialAction } from '../../util/special-actions';
import { FileEntryProps } from './BaseFileEntry';
import { ClickableFileEntry } from './ClickableFileEntry';

export interface DnDProps {
    dndIsDragging?: boolean;
    dndIsOver?: boolean;
    dndCanDrop?: boolean;
}

export type DnDFileEntryItem = DragObjectWithType & { file: Nullable<FileData> };
export const DnDFileEntryType = 'chonky-file-entry';

export const DnDFileEntry: React.FC<FileEntryProps> = (props) => {
    const { file } = props;

    const dispatchSpecialAction = useContext(ChonkyDispatchSpecialActionContext);

    interface ChonkyDnDDropResult {
        dropTarget: Nilable<FileData>;
        dropEffect: 'move' | 'copy';
    }

    // For drag source
    const canDrag = FileHelper.isDraggable(file);
    const onDragStart = useCallback(() => {
        if (!FileHelper.isDraggable(file)) return;

        dispatchSpecialAction({
            actionName: SpecialAction.DragNDropStart,
            dragSource: file,
        });
    }, [dispatchSpecialAction, file]);
    const onDragEnd = useCallback(
        (item: DnDFileEntryItem, monitor: DragSourceMonitor) => {
            const dropResult = monitor.getDropResult() as ChonkyDnDDropResult;
            if (
                !FileHelper.isDraggable(file) ||
                !dropResult ||
                !dropResult.dropTarget
            ) {
                return;
            }

            dispatchSpecialAction({
                actionName: SpecialAction.DragNDropEnd,
                dragSource: file,
                dropTarget: dropResult.dropTarget,
                dropEffect: dropResult.dropEffect,
            });
        },
        [dispatchSpecialAction, file]
    );

    // For drop target
    const onDrop = useCallback(
        (item: DnDFileEntryItem, monitor) => {
            if (!monitor.canDrop()) return;
            const customDropResult: ExcludeKeys<ChonkyDnDDropResult, 'dropEffect'> = {
                dropTarget: file,
            };
            return customDropResult;
        },
        [file]
    );
    const canDrop = useCallback(
        (item: DnDFileEntryItem) => {
            const isSameFile = item.file?.id === file?.id;
            return FileHelper.isDroppable(file) && !isSameFile;
        },
        [file]
    );

    // Create refs for react-dnd hooks
    const [{ isDragging: dndIsDragging }, drag, preview] = useDrag({
        item: { type: DnDFileEntryType, file } as DnDFileEntryItem,
        canDrag,
        begin: onDragStart,
        end: onDragEnd,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });
    const [{ isOver: dndIsOver, canDrop: dndCanDrop }, drop] = useDrop({
        accept: DnDFileEntryType,
        drop: onDrop,
        canDrop,
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    useEffect(() => {
        // Set drag preview to an empty image because `DnDFileListDragLayer` will
        // provide its own preview.
        preview(getEmptyImage(), { captureDraggingState: true });
    }, []);

    return (
        <div
            ref={drop}
            className="chonky-file-entry-droppable-wrapper chonky-fill-parent"
        >
            <div
                ref={FileHelper.isDraggable(file) ? drag : null}
                className="chonky-file-entry-draggable-wrapper chonky-fill-parent"
            >
                <ClickableFileEntry
                    {...props}
                    dndIsDragging={dndIsDragging}
                    dndIsOver={dndIsOver}
                    dndCanDrop={dndCanDrop}
                />
            </div>
        </div>
    );
};