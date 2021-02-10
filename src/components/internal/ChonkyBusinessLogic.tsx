/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2020
 * @license MIT
 */

import React from 'react';

import { reduxActions } from '../../redux/reducers';
import { initialRootState } from '../../redux/state';
import { useDTE } from '../../redux/store';
import {
    thunkActivateSortAction,
    thunkUpdateDefaultFileViewActionId,
    thunkUpdateRawFileActions,
} from '../../redux/thunks/file-actions.thunks';
import {
    thunkUpdateRawFiles,
    thunkUpdateRawFolderChain,
} from '../../redux/thunks/files.thunks';
import { FileBrowserHandle, FileBrowserProps } from '../../types/file-browser.types';
import { defaultConfig } from '../../util/default-config';
import { useFileBrowserHandle } from '../../util/file-browser-handle';
import { getValueOrFallback } from '../../util/helpers';

export const ChonkyBusinessLogicInner = React.forwardRef<
    FileBrowserHandle,
    FileBrowserProps
>((props, ref) => {
    // ==== Update Redux state
    useDTE(thunkUpdateRawFiles, props.files ?? initialRootState.rawFiles);
    useDTE(thunkUpdateRawFolderChain, props.folderChain);
    useDTE(
        thunkUpdateRawFileActions,
        getValueOrFallback(props.fileActions, defaultConfig.fileActions),
        getValueOrFallback(
            props.disableDefaultFileActions,
            defaultConfig.disableDefaultFileActions
        )
    );
    // @ts-ignore
    useDTE(
        // @ts-ignore
        reduxActions.setExternalFileActionHandler,
        // @ts-ignore
        getValueOrFallback(props.onFileAction, defaultConfig.onFileAction)
    );
    useDTE(
        reduxActions.setSelectionDisabled,
        // @ts-ignore
        getValueOrFallback(
            props.disableSelection,
            defaultConfig.disableSelection,
            'boolean'
        )
    );
    useDTE(
        thunkActivateSortAction,
        getValueOrFallback(props.defaultSortActionId, defaultConfig.defaultSortActionId)
    );
    useDTE(
        thunkUpdateDefaultFileViewActionId,
        getValueOrFallback(
            props.defaultFileViewActionId,
            defaultConfig.defaultFileViewActionId,
            'string'
        )
    );

    useDTE(
        reduxActions.setThumbnailGenerator,
        // @ts-ignore
        getValueOrFallback(props.thumbnailGenerator, defaultConfig.thumbnailGenerator)
    );
    useDTE(
        reduxActions.setDoubleClickDelay,
        // @ts-ignore
        getValueOrFallback(
            props.doubleClickDelay,
            defaultConfig.doubleClickDelay,
            'number'
        )
    );
    useDTE(
        reduxActions.setDisableDragAndDrop,
        // @ts-ignore
        getValueOrFallback(
            props.disableDragAndDrop,
            defaultConfig.disableDragAndDrop,
            'boolean'
        )
    );
    useDTE(
        reduxActions.setClearSelectionOnOutsideClick,
        // @ts-ignore
        getValueOrFallback(
            props.clearSelectionOnOutsideClick,
            defaultConfig.clearSelectionOnOutsideClick,
            'boolean'
        )
    );

    // ==== Setup the imperative handle for external use
    useFileBrowserHandle(ref);

    return null;
});
ChonkyBusinessLogicInner.displayName = 'ChonkyBusinessLogicInner';

export const ChonkyBusinessLogic = React.memo(ChonkyBusinessLogicInner);
ChonkyBusinessLogic.displayName = 'ChonkyBusinessLogic';