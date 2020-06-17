import c from 'classnames';
import React, { useCallback, useContext } from 'react';
import { Grid } from 'react-virtualized';

import { FileArray } from '../../typedef';
import {
    ChonkyEnableDragAndDropContext,
    ChonkySelectionContext,
} from '../../util/context';
import { isMobileDevice } from '../../util/validation';
import { FileEntryProps } from '../internal/BaseFileEntry';
import { ClickableFileEntry } from '../internal/ClickableFileEntry';
import { DnDFileEntry } from '../internal/DnDFileEntry';
import { ChonkyIconFA, ChonkyIconName } from './ChonkyIcon';
import { Nilable } from 'tsdef';

export interface EntrySize {
    width: number;
    height: number;
}

export const SmallThumbsSize: EntrySize = { width: 160, height: 120 };

export const getColWidth = (
    index: number,
    columnCount: number,
    entrySize: EntrySize,
    gutterSize: number
) => {
    if (index === columnCount - 1) return entrySize.width;
    return entrySize.width + gutterSize;
};

export const getRowHeight = (
    index: number,
    rowCount: number,
    entrySize: EntrySize,
    gutterSize: number
) => {
    if (index === rowCount - 1) return entrySize.height;
    return entrySize.height + gutterSize;
};

export const useEntryRenderer = (files: FileArray) => {
    const selection = useContext(ChonkySelectionContext);
    const enableDragAndDrop = useContext(ChonkyEnableDragAndDropContext);
    // All hook parameters should go into `deps` array
    const deps = [files, selection, enableDragAndDrop];
    const entryRenderer = useCallback(
        (
            virtualKey: string,
            index: number,
            style: any,
            parent: any,
            gutterSize?: number,
            lastRow?: boolean,
            lastColumn?: boolean
        ) => {
            if (typeof gutterSize === 'number') {
                if (!lastRow) style.height = style.height - gutterSize;

                if (!lastColumn) style.width = style.width - gutterSize;
            }

            // When rendering the file list, some browsers cut off the last pixel of
            // a file entry, making it look ugly. To get around this rendering bug
            // we make file entries in the last row/column 1 pixel shorter.
            // TODO: Instead of subtracting 1 here, add 1 to width/height of last
            //  column.
            if (lastRow) style.height = style.height - 1;
            if (lastColumn) style.width = style.width - 1;

            if (index >= files.length) return null;
            const file = files[index];
            const key = file ? file.id : `loading-file-${virtualKey}`;
            const entryProps: FileEntryProps = {
                file,
                displayIndex: index,

                // We deliberately don't use `FileHelper.isSelectable` here. We want
                // the UI to represent the true state of selection. This will help users
                // see what exactly the selection is before running some code.
                selected: !!file && selection[file.id] === true,
            };

            const fileEntryComponent = enableDragAndDrop ? (
                <DnDFileEntry {...entryProps} />
            ) : (
                <ClickableFileEntry {...entryProps} />
            );
            return (
                <div key={key} className="chonky-virtualization-wrapper" style={style}>
                    {fileEntryComponent}
                </div>
            );
        },
        deps
    );

    return entryRenderer;
};

export const noContentRenderer = (height?: number) => {
    const placeholderProps: any = {
        className: c({
            'chonky-file-list-notification': true,
            'chonky-file-list-notification-empty': true,
        }),
    };
    if (typeof height === 'number') placeholderProps.style = { height };

    return (
        <div {...placeholderProps}>
            <div className="chonky-file-list-notification-content">
                <ChonkyIconFA icon={ChonkyIconName.folderOpen} />
                &nbsp; Nothing to show
            </div>
        </div>
    );
};

export const useGridRenderer = (
    files: FileArray,
    entryRenderer: ReturnType<typeof useEntryRenderer>,
    thumbsGridRef: React.Ref<Nilable<Grid>>,
    fillParentContainer: boolean
) => {
    const deps = [files, entryRenderer, thumbsGridRef, fillParentContainer];
    return useCallback(({ width, height }) => {
        let columnCount: number;
        let entrySize = SmallThumbsSize;

        const isMobile = isMobileDevice();
        const gutter = isMobile ? 5 : 8;
        const scrollbar = !fillParentContainer || isMobile ? 0 : 16;

        // TODO: const isLargeThumbs = view === FileView.LargeThumbs;
        const isLargeThumbs = false;
        if (isMobile && width < 400) {
            // Hardcode column count on mobile
            columnCount = isLargeThumbs ? 2 : 3;
            entrySize = {
                width: Math.floor((width - gutter * (columnCount - 1)) / columnCount),
                height: isLargeThumbs ? 160 : 120,
            };
        } else {
            const columnCountFloat =
                (width + gutter - scrollbar) / (entrySize.width + gutter);
            columnCount = Math.max(1, Math.floor(columnCountFloat));
        }
        const rowCount = Math.ceil(files.length / columnCount);

        return (
            <Grid
                style={{ minHeight: entrySize.height + 10 }}
                ref={thumbsGridRef as any}
                cellRenderer={(data) => {
                    const index = data.rowIndex * columnCount + data.columnIndex;
                    return entryRenderer(
                        data.key,
                        index,
                        { ...data.style },
                        data.parent,
                        gutter,
                        data.rowIndex === rowCount - 1,
                        data.columnIndex === columnCount - 1
                    );
                }}
                noContentRenderer={() => noContentRenderer(entrySize.height)}
                rowCount={rowCount}
                columnCount={columnCount}
                columnWidth={({ index }) =>
                    getColWidth(index, columnCount, entrySize, gutter)
                }
                rowHeight={({ index }) =>
                    getRowHeight(index, rowCount, entrySize, gutter)
                }
                overscanRowCount={2}
                width={width}
                height={typeof height === 'number' ? height : 500}
                autoHeight={!fillParentContainer}
                tabIndex={null}
            />
        );
    }, deps);
};
