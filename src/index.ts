import { Reactive } from 'vue';

import {
    Data as BaseData,
    SelectorMap,
    State
} from '@webkrafters/eagleeye';

export type Data<
    S extends SelectorMap = SelectorMap,
    T extends State = State
> = Reactive<BaseData<S, T>>;

export type {
    Immutable as AutoImmutable,
    BaseType,
    ClearCommand,
    KeyType,
    MoveCommand,
    PushCommand,
    ReplaceCommand,
    SetCommand,
    SpliceCommand,
    TagCommand,
    TagType,
    UpdateStats,
    UpdatePayload,
    UpdatePayloadArray
} from '@webkrafters/auto-immutable';

export type {
    ArraySelector,
    Changes,
    FullStateSelector,
    IStorage,
    IStore,
    Listener,
    ObjectSelector,
    Prehooks,
    ProviderProps,
    Store,
    StoreInternal,
    StoreRef,
    Stream as BaseStream,
    Text,
    Unsubscribe
} from '@webkrafters/eagleeye';

export {
    Channel as BaseChannel,
    CLEAR_TAG,
    DELETE_TAG,
    FULL_STATE_SELECTOR,
    MOVE_TAG,
    NULL_SELECTOR,
    PUSH_TAG,
    REPLACE_TAG,
    SET_TAG,
    SPLICE_TAG,
    Tag
} from '@webkrafters/eagleeye';

export type {
    BaseData,
    SelectorMap,
    State
};

export {
    VueEagleEye as EagleEyeContext,
    createContext as createEagleEye
} from './main';
