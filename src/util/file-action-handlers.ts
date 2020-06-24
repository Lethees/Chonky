import Promise from 'bluebird';
import { useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { Nullable, Undefinable } from 'tsdef';

import {
    dispatchFileActionState,
    fileActionMapState,
} from '../recoil/file-actions.recoil';
import { filesState } from '../recoil/files.recoil';
import { selectionState } from '../recoil/selection.recoil';
import { dispatchSpecialActionState } from '../recoil/special-actions.recoil';
import {
    FileAction,
    FileActionData,
    FileActionHandler,
    InternalFileActionDispatcher,
} from '../types/file-actions.types';
import { SpecialAction } from '../types/special-actions.types';
import { useInstanceVariable } from './hooks-helpers';
import { Logger } from './logger';
import { SelectionHelper } from './selection';
import { isFunction } from './validation';

export const useInternalFileActionDispatcher = (
    externalFileActonHandler: Nullable<FileActionHandler>
): InternalFileActionDispatcher => {
    const externalFileActonHandlerRef = useInstanceVariable(externalFileActonHandler);

    const fileActionMap = useRecoilValue(fileActionMapState);
    const fileActionMapRef = useInstanceVariable(fileActionMap);

    const dispatchFileAction: InternalFileActionDispatcher = useCallback(
        (actionData) => {
            Logger.debug(`FILE ACTION DISPATCH:`, actionData);
            const { current: onFileAction } = externalFileActonHandlerRef;
            const { current: fileActionMap } = fileActionMapRef;
            const { actionId } = actionData;

            const action = fileActionMap[actionId];
            if (action) {
                if (isFunction(onFileAction)) {
                    Promise.resolve()
                        .then(() => onFileAction(action, actionData))
                        .catch((error) =>
                            Logger.error(
                                `User-defined "onAction" handler threw an error: ${error.message}`
                            )
                        );
                }
            } else {
                Logger.error(
                    `Internal components dispatched a "${actionId}" file action, ` +
                        `but such action was not registered.`
                );
            }
        },
        [externalFileActonHandlerRef, fileActionMapRef]
    );

    return dispatchFileAction;
};

export const useInternalFileActionRequester = () => {
    // Write Recoil state to instance variables so we can access these values from
    // the callback below without re-creating the callback function
    const fileActionMapRef = useInstanceVariable(useRecoilValue(fileActionMapState));
    const dispatchFileActionRef = useInstanceVariable(
        useRecoilValue(dispatchFileActionState)
    );
    const dispatchSpecialActionRef = useInstanceVariable(
        useRecoilValue(dispatchSpecialActionState)
    );
    const filesRef = useInstanceVariable(useRecoilValue(filesState));
    const selectionRef = useInstanceVariable(useRecoilValue(selectionState));

    return useCallback(
        (fileActionId: string): void => {
            Logger.debug(`FILE ACTION REQUEST:`, fileActionId);

            const action: Undefinable<FileAction> =
                fileActionMapRef.current[fileActionId];
            if (!action) {
                Logger.warn(
                    `Internal components requested the "${fileActionId}" file ` +
                        `action, but such action was not registered.`
                );
                return;
            }

            // Determine files for the action if action requires selection
            const selectedFilesForAction = action.requiresSelection
                ? SelectionHelper.getSelectedFiles(
                      filesRef.current,
                      selectionRef.current,
                      action.fileFilter
                  )
                : undefined;

            console.log('ACTION', action.id, selectedFilesForAction, action.fileFilter);

            if (
                action.requiresSelection &&
                (!selectedFilesForAction || selectedFilesForAction.length === 0)
            ) {
                Logger.warn(
                    `Internal components requested the "${fileActionId}" file ` +
                        `action, but the selection for this action was empty. This ` +
                        `might a bug in the code of the presentational components.`
                );
                return;
            }

            const actionData: FileActionData = {
                actionId: action.id,
                target: undefined,
                files: selectedFilesForAction,
            };

            dispatchFileActionRef.current(actionData);

            const specialActionId = action.specialActionToDispatch;
            if (specialActionId) {
                // We can only dispatch "simple" special actions, i.e. special
                // actions that do not require additional parameters.
                switch (specialActionId) {
                    case SpecialAction.OpenParentFolder:
                    case SpecialAction.ToggleSearchBar:
                        dispatchSpecialActionRef.current({
                            actionId: specialActionId,
                        });
                        break;
                    default:
                        Logger.warn(
                            `File action "${action.id}" tried to dispatch a ` +
                                `special action "${specialActionId}", but that ` +
                                `special action was not marked as simple. File ` +
                                `actions can only trigger simple special actions.`
                        );
                }
            }
        },
        [
            fileActionMapRef,
            dispatchFileActionRef,
            dispatchSpecialActionRef,
            filesRef,
            selectionRef,
        ]
    );
};