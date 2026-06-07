import type {
	SelectorMap,
	Data,
	Changes
} from '..';

import {
	EagleEyeContext,
	createEagleEye
} from '@webkrafters/eagleeye';

import { onBeforeUnmount, reactive } from 'vue';

import {
	AutoImmutable,
	BaseStream,
	BaseChannel,
	IStorage,
	Prehooks,
	Store,
	State
} from '..';

export class Channel<
	T extends State, 
	const S extends SelectorMap
> {
	private _channel : BaseChannel<T, S>;
	private _data = reactive({}) as Data<S, T>;
	private _store : Store<T,S>;
	constructor( stream : BaseStream<T>, selectorMap : S ) {
		this._channel = stream( selectorMap ) as BaseChannel<T, S>;
		const sync = this.updateData.bind( this );
		this._channel.addListener( 'data-changed', sync );
		onBeforeUnmount(() => {
			this._channel.removeListener( 'data-changed', sync );
			this._channel.endStream();
		});
		this._store = ( $ => {
			return {
				get data() { return $._data },
				set selectorMap( selectorMap : S ) {
					$._channel.selectorMap = selectorMap;
				},
				resetState: $._resetState.bind( $ ),
				setState: $._setState.bind( $ )
			};
		})( this );
		sync();
	}
	get store() { return this._store }
	private _resetState( propertyPaths?: string[] ) {
		this._channel.resetState( propertyPaths );
	}
	private _setState( changes : Changes<T> ) {
		this._channel.setState( changes );
	}
	private updateData() {
		const cData = this._channel.data;
		const currFieldMap = this.getCurrStateFieldMap();
		for( let k in cData ) {
			const c = k as string;
			this._data[ c ] = cData[ k ];
			delete currFieldMap[ c ];
		}
		for( let k in currFieldMap ) {
			delete this._data[ k as string ];
		}
	}
	private getCurrStateFieldMap() {
		const map = {};
		for( const k of Object.keys( this._data ) ) {
			map[ k ] = true;
		}
		return map;
	}
}

export class VueEagleEye<T extends State> {
	private consumer : EagleEyeContext<T>;

	constructor(
		value? : T,
		prehooks? : Prehooks<T>,
		storage? : IStorage<T>
	); 
	constructor(
		value? : AutoImmutable<T>,
		prehooks? : Prehooks<T>,
		storage? : IStorage<T>
	);
	constructor( value, prehooks, storage ) {
		this.consumer = createEagleEye({ prehooks, storage, value });
	}
		
	get cache(){ return this.consumer.cache }

	get closed(){ return this.consumer.closed }

	get prehooks() { return this.consumer.prehooks }

	get storage() { return this.consumer.storage }

	get store() { return this.consumer.store }

	/** 
	 * Actively monitors the store and triggers component re-render if any of the watched keys in the state objects changes
	 * 
	 * @param context - Refers to the PublicObservableContext<T> type of the ObservableContext<T>
	 * @param [selectorMap = {}] - Key:value pairs where `key` => arbitrary key given to a Store.data property holding a state slice and `value` => property path to a state slice used by this component: see examples below. May add a mapping for a certain arbitrary key='state' and value='@@STATE' to indicate a desire to obtain the entire state object and assign to a `state` property of Store.data. A change in any of the referenced properties results in this component render. When using '@@STATE', note that any change within the state object will result in this component render.
	 * @see {ObservableContext<STATE>}
	 * 
	 * @example
	 * a valid property path follows the `lodash` object property path convention.
	 * for a state = { a: 1, b: 2, c: 3, d: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] } }
	 * Any of the following is an applicable selector map.
	 * ['d', 'a'] => {
	 * 		0: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] },
	 * 		1: 1
	 * }
	 * {myData: 'd', count: 'a'} => {
	 * 		myData: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] },
	 * 		count: 1
	 * }
	 * {count: 'a'} => {count: 1} // same applies to {count: 'b'} = {count: 2}; {count: 'c'} = {count: 3}
	 * {myData: 'd'} => {mydata: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] }}
	 * {xyz: 'd.e'} => {xyz: 5}
	 * {def: 'd.e.f'} => {def: [6, { x: 7, y: 8, z: 9 } ]}
	 * {f1: 'd.e.f[0]'} or {f1: 'd.e.f.0'} => {f1: 6}
	 * {secondFElement: 'd.e.f[1]'} or {secondFElement: 'd.e.f.1'} => {secondFElement: { x: 7, y: 8, z: 9 }}
	 * {myX: 'd.e.f[1].x'} or {myX: 'd.e.f.1.x'} => {myX: 7} // same applies to {myY: 'd.e.f[1].y'} = {myY: 8}; {myZ: 'd.e.f[1].z'} = {myZ: 9}
	 * {myData: '@@STATE'} => {myData: state}
	 */
	get stream() {
		const stream = this.consumer.stream;
		return <const S extends SelectorMap>( selectorMap? : S ) => (
			new Channel<T, S>( stream, selectorMap ).store
		);
	}

	set prehooks( prehooks : Prehooks<T> ) {
		this.consumer.prehooks = prehooks;
	}

	set storage( storage : IStorage<T> ) {
		this.consumer.storage = storage;
	}

	dispose(){ this.consumer.dispose() }
}

export function createContext<T extends State>(
	value? : T,
	prehooks? : Prehooks<T>,
	storage? : IStorage<T>
) : VueEagleEye<T>; 
export function createContext<T extends State>(
	value? : AutoImmutable<T>,
	prehooks? : Prehooks<T>,
	storage? : IStorage<T>
) : VueEagleEye<T>; 
export function createContext<T extends State>(
	value, prehooks, storage
) : VueEagleEye<T> {
	return new VueEagleEye<T>( value, prehooks, storage );
};
