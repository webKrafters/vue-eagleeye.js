import { Reactive } from 'vue';

import type {
    Data as BaseData,
    IStore,
    SelectorMap,
    State
} from '@webkrafters/eagleeye';

export type Data<
    S extends SelectorMap = SelectorMap,
    T extends State = State
> = Reactive<BaseData<S, T>>;

export interface Store<
    T extends State = State,
    S extends SelectorMap = SelectorMap
> extends IStore<T> {
    get data() : Data<S, T>
    set selectorMap( selectorMap : S );
}

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
    Listener,
    ObjectSelector,
    Prehooks,
    ProviderProps,
    StoreInternal,
    Store as BaseStore,
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
    IStore,
    SelectorMap,
    State
};

export {
    VueEagleEye as EagleEyeContext,
    createContext as createEagleEye
} from './main';
