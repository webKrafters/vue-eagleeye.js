import { mount } from '@vue/test-utils';

import * as AutoImmutableModule from '@webkrafters/auto-immutable';

import {
	Changes,
	createEagleEye,
	FULL_STATE_SELECTOR,
	IStorage,
	Prehooks,
	SelectorMap,
	State,
	Store
} from '../';

import createSourceData, { SourceData } from '../test-artifacts/data/create-state-obj';
import { VueEagleEye } from '.';

describe( 'Context', () => {
	let getDefState : () => SourceData;
	let getUpdatePayload : () => Changes<SourceData>;
	beforeAll(() => {
		getDefState = createSourceData;
		const defState = getDefState();
		getUpdatePayload = () => ({
			age: defState.age === 37 ? 38 : 37,
			name: { first: defState.name.first === 'Jonathan' ? 'Bennett' : 'Jonathan' },
			friends: {
				1: {
					name: {
						first: defState.friends[ 1 ].name.first === 'Agent 007' ? 'Iron Man' : 'Agent 007'
					}
				}
			}
		} as unknown as Changes<SourceData> );
	}); 
	describe( 'Service Engine', () => {
		test( 'should be created', () => {
			const changes = getUpdatePayload();
			const defState = getDefState();
			mountDriver( createSourceData() )(
				({ context: ctx }) => {
					expect( ctx ).toBeTruthy();
					const onChangeMock = jest.fn();
					const unsub = ctx.store.subscribe( 'data-updated', onChangeMock );
					expect( onChangeMock ).not.toHaveBeenCalled();
					ctx.store.setState( changes );
					expect( onChangeMock ).toHaveBeenCalled();
					expect( onChangeMock.mock.calls[ 0 ][ 0 ] ).toEqual( changes );
					expect( onChangeMock.mock.calls[ 0 ][ 1 ] ).toEqual([
						[ 'age' ],
						[ 'name', 'first' ],
						[ 'friends', 1, 'name', 'first' ]
					]);
					expect( onChangeMock.mock.calls[ 0 ][ 2 ] ).toEqual({
						...changes, friends: [
							undefined,  ( changes as SourceData ).friends[ 1 ]
						]
					});
					expect( onChangeMock.mock.calls[ 0 ][ 3 ] ).toEqual( expect.any( Function ) );
					onChangeMock.mockClear();
					ctx.store.setState( changes ); // noop for repeat setState with same payload
					expect( onChangeMock ).not.toHaveBeenCalled();
					ctx.store.resetState([ 'age', 'friends[1].name.first', 'name.first' ]); // triggers resetState
					expect( onChangeMock ).toHaveBeenCalled();
					expect( onChangeMock.mock.calls[ 0 ][ 0 ] ).toEqual({
						age: {
							[ AutoImmutableModule.REPLACE_TAG]: defState.age,
						},
						name: {
							first: {
								[ AutoImmutableModule.REPLACE_TAG]: defState.name.first,
							}
						},
						friends: {
							1: {
								name: {
									first: {
										[ AutoImmutableModule.REPLACE_TAG ]: defState.friends[ 1 ].name.first
									}
								}
							}
						}
					});
					expect( onChangeMock.mock.calls[ 0 ][ 1 ] ).toEqual([
						[ 'age' ],
						[ 'friends', 1, 'name', 'first' ],
						[ 'name', 'first' ]
					]);
					expect( onChangeMock.mock.calls[ 0 ][ 2 ] ).toEqual({
						age: defState.age,
						friends: [ undefined, { name: { first: defState.friends[ 1 ].name.first } } ],
						name: { first: defState.name.first }
					});
					expect( onChangeMock.mock.calls[ 0 ][ 3 ] ).toEqual( expect.any( Function ) );
					onChangeMock.mockClear();
					// upon unsubscribing to changes
					unsub();
					ctx.store.setState( changes );
					let data = ctx.store.getState([
						'age', 'name.first', 'friends[1].name.first'
					]);
					// changes can be still be made
					expect( data.age ).not.toEqual( defState.age );
					expect( data.name.first ).not.toEqual( defState.name.first );
					expect( data.friends[ 1 ].name.first ).not.toEqual( defState.friends[ 1 ].name.first );
					// but onChange no longer called.
					expect( onChangeMock ).not.toHaveBeenCalled();
					ctx.store.resetState([ FULL_STATE_SELECTOR ]);
					// state reset could still take place.
					data = ctx.store.getState([
						'age', 'name.first', 'friends[1].name.first'
					]);
					expect( data.age ).toEqual( defState.age );
					expect( data.name.first ).toEqual( defState.name.first );
					expect( data.friends[ 1 ].name.first ).toEqual( defState.friends[ 1 ].name.first );
					// but onChange no longer called.
					expect( onChangeMock ).not.toHaveBeenCalled();
				}
			);
		});
	} );
	describe( 'dispose(...)', () => {
		test( 'manually releases memory before exiting', () => {
			const value = createSourceData();
			mountDriver( value )(({ context: ctx }) => {
				expect( ctx.closed ).toBe( false );
				expect( ctx.store.getState() ).toEqual( value );
				ctx.dispose();
				// can no longer obtain new data
				expect( ctx.store.getState() ).toBeUndefined();
			});
		});
	});
	describe( 'stream(...)', () => {
		test( 'returns a dedicated store for streaming', () => {
			const value = createSourceData();
			const selectorMap = {
				fName: 'name.first',
				company: 'company',
				bff_fname: 'friends[0].name.first'
			} as const;
			const propertyPaths = Object.values( selectorMap );
			mountDriver( value, selectorMap )(({
				context: ctx,
				streamChannel: store
			}) => {
				let currStateVals = ctx.store.getState( propertyPaths );
				expect( store.data.fName ).toEqual( value.name.first );
				expect( store.data.fName ).toEqual( currStateVals.name.first );
				expect( store.data.company ).toEqual( value.company );
				expect( store.data.company ).toEqual( currStateVals.company );
				expect( store.data.bff_fname ).toEqual( value.friends[ 0 ].name.first );
				expect( store.data.bff_fname ).toEqual( currStateVals.friends[ 0 ].name.first );
				
				store.setState({
					company: 'TESTING_COMPANY',
					friends: { 0: { name: { first : 'TESTING_BFF_NAME' } } },
					name: { first: 'MY_TESTING_NAME' }
				} as unknown as  SourceData );
				currStateVals = ctx.store.getState( propertyPaths );
				expect( store.data.fName ).not.toEqual( value.name.first );
				expect( store.data.fName ).toEqual( currStateVals.name.first );
				expect( store.data.company ).not.toEqual( value.company );
				expect( store.data.company ).toEqual( currStateVals.company );
				expect( store.data.bff_fname ).not.toEqual( value.friends[ 0 ].name.first );
				expect( store.data.bff_fname ).toEqual( currStateVals.friends[ 0 ].name.first );

				store.resetState();
				currStateVals = ctx.store.getState( propertyPaths );
				expect( store.data.fName ).toEqual( value.name.first );
				expect( store.data.fName ).toEqual( currStateVals.name.first );
				expect( store.data.company ).toEqual( value.company );
				expect( store.data.company ).toEqual( currStateVals.company );
				expect( store.data.bff_fname ).toEqual( value.friends[ 0 ].name.first );
				expect( store.data.bff_fname ).toEqual( currStateVals.friends[ 0 ].name.first );
			});
		} );
		describe( 'using the stream(...)', () => {
			const selectorMap = {
				year3: 'history.places[2].year',
				isActive: 'isActive',
				tag6: 'tags[5]',
				all: FULL_STATE_SELECTOR
			} as const;
			const sourceData = createSourceData();
			test( 'accepts object based selectorMap', () => {
				mountDriver( sourceData, selectorMap )(({
					streamChannel: store
				}) => {
					expect( store.data ).toEqual({
						all: sourceData,
						isActive: sourceData.isActive,
						tag6: sourceData.tags[ 5 ],
						year3: sourceData.history.places[ 2 ].year
					});
				} );
			} );
			test( 'accepts an array of propeerty paths and produces indexed-based data property', () => {
				mountDriver( sourceData, [
					'history.places[2].year',
					'isActive',
					'tags[5]',
					FULL_STATE_SELECTOR, 
					'tags',
					'history.places[2].country'
				])(({ streamChannel: store }) => {
					expect( store.data ).toEqual({
						0: sourceData.history.places[ 2 ].year,
						1: sourceData.isActive,
						2: sourceData.tags[ 5 ],
						3: sourceData,
						4: sourceData.tags,
						5: sourceData.history.places[ 2 ].country
					});
				});
			} );
			test( 'omitting selectorMap produces empty data property', () => {
				mountDriver( sourceData )(({
					streamChannel: store
				}) => expect( store.data ).toEqual({}));
			} );
			describe( 'selectorMap update', () => {
				const selectorMapOnRender =  {
					year3: 'history.places[2].year',
					isActive: 'isActive',
					tag6: 'tags[5]'
				} as const;
				const selectorMapOnRerender = {
					...selectorMapOnRender,
					country3: 'history.places[2].country'
				} as const
				describe( 'normal flow', () => {
					test( 'adjusts the store on selctorMap change', () => {
						mountDriver( createSourceData(), selectorMapOnRender )(
							({ streamChannel: store }) => {
								expect( Object.keys( store.data ) )
									.toEqual( Object.keys( selectorMapOnRender ));
								store.selectorMap = selectorMapOnRerender;
								expect( Object.keys( store.data ) )
									.toEqual( Object.keys( selectorMapOnRerender ));
							}
						);
					});
					describe( 'when the new selectorMap is not empty', () => {
						test( 'refreshes state data', () => {
							mountDriver( createSourceData() )(
								({ streamChannel: store }) => {
									expect( store.data ).toEqual({});
									store.selectorMap = selectorMapOnRerender;
									expect( Object.keys( store.data ) )
										.toEqual( Object.keys( selectorMapOnRerender ) );
								}
							);
						} );
					});
				} );
				describe( 'when the new selectorMap is empty', () => {
					describe( 'and existing data is not empty', () => {
						test( 'adjusts the store on selctorMap change', () => {
							mountDriver( createSourceData(), selectorMapOnRender )(
								({ streamChannel: store }) => {
									expect( Object.keys( store.data ) )
										.toEqual( Object.keys( selectorMapOnRender ));
									store.selectorMap = undefined as unknown as typeof selectorMapOnRender;
									expect( store.data ).toEqual({});
								}
							);
						} );
						test( 'refreshes state data with empty object', async () => {
							mountDriver( undefined, selectorMapOnRender )(
								({ streamChannel: store }) => {
									expect( Object.keys( store.data ) )
										.toEqual( Object.keys( selectorMapOnRender ) );
									store.selectorMap = undefined as unknown as typeof selectorMap;
									expect( store.data ).toEqual({});
								}
							);
						} );
					} );
					describe( 'and existing data is empty', () => {
						test( 'leaves the store as-is on selctorMap change', async () => {
							mountDriver()(({ streamChannel: store }) => {
								expect( store.data ).toEqual({});
								store.selectorMap = {};
								expect( store.data ).toEqual({});
							});
						} );
					} );
				} );
			} );
			describe( 'stream.data', () => {
				const defaultState = createSourceData();
				test( 'properties are members of the Vue Reactive type', () => {
					mountDriver( createSourceData(), {
						country3: 'history.places[2].country',
						isActive: 'isActive',
						myAge: 'age'
					} as const )(({
						context: ctx,
						streamChannel: store
					}) => {
						expect( store.data ).toEqual({
							country3: defaultState.history.places[ 2 ].country,
							isActive: defaultState.isActive,
							myAge: defaultState.age
						});
						// while writeable, reactive property changes do not affect application state
						// @ts-expect-error
						store.data.myAge = 51;
						expect( store.data ).toEqual({
							country3: defaultState.history.places[ 2 ].country,
							isActive: defaultState.isActive,
							myAge: 51
						});
						expect( ctx.store.getState().age ).toBe( defaultState.age );
						expect( store.data.myAge ).not.toEqual( defaultState.age );
						// must use stream's `store.setState` or `context.store.setState` to update application state
						store.setState({ age: store.data.myAge } as Changes<SourceData> );
						expect( store.data.myAge ).toBe( 51 );
						expect( ctx.store.getState().age ).toBe( 51 );
					});
				} );
				test( 'carries the latest state data as referenced by the selectorMap', async () => {
					mountDriver( createSourceData(), {
						city3: 'history.places[2].city',
						country3: 'history.places[2].country',
						friends: 'friends',
						year3: 'history.places[2].year',
						isActive: 'isActive',
						tag6: 'tags[5]',
						tag7: 'tags[6]',
						tags: 'tags'
					} as const )(({ streamChannel: store}) => {
						const expectedValue = {
							city3: defaultState.history.places[ 2 ].city,
							country3: defaultState.history.places[ 2 ].country,
							friends: defaultState.friends,
							year3: defaultState.history.places[ 2 ].year,
							isActive: defaultState.isActive,
							tag6: defaultState.tags[ 5 ],
							tag7: defaultState.tags[ 6 ],
							tags: defaultState.tags
						};
						expect( store.data ).toEqual( expectedValue )
						store.setState({
							friends: { [ AutoImmutableModule.MOVE_TAG ]: [ -1, 1 ] },
							isActive: true,
							history: {
								places: {
									2: {
										city: 'Marakesh',
										country: 'Morocco'
									}
								}
							},
							tags: { [ AutoImmutableModule.DELETE_TAG ]: [ 3, 5 ] }
						} as unknown as SourceData );
						expect( store.data ).toEqual({
							...expectedValue,
							city3: 'Marakesh',
							country3: 'Morocco',
							friends: [ 0, 2, 1 ].map( i => defaultState.friends[ i ] ),
							isActive: true,
							tag6: undefined,
							tag7: undefined,
							tags: [ 0, 1, 2, 4, 6 ].map( i => defaultState.tags[ i ] )
						});
					});
				}, 3e4 );
				test( 'holds the complete current state object whenever `' + FULL_STATE_SELECTOR + '` entry appears in the selectorMap', async () => {
					mountDriver( createSourceData(), {
						city3: 'history.places[2].city',
						country3: 'history.places[2].country',
						year3: 'history.places[2].year',
						isActive: 'isActive',
						tag6: 'tags[5]',
						tag7: 'tags[6]',
						state: FULL_STATE_SELECTOR
					} as const )(({ streamChannel: store }) => {
						const expectedValue = {
							city3: defaultState.history.places[ 2 ].city,
							country3: defaultState.history.places[ 2 ].country,
							year3: defaultState.history.places[ 2 ].year,
							isActive: defaultState.isActive,
							tag6: defaultState.tags[ 5 ],
							tag7: defaultState.tags[ 6 ],
							state: defaultState
						};
						expect( store.data ).toEqual( expectedValue );
						store.setState({
							isActive: true,
							history: {
								places: {
									2: {
										city: 'Marakesh',
										country: 'Morocco'
									}
								}
							}
						} as unknown as SourceData );
						const updatedDataEquiv = createSourceData();
						updatedDataEquiv.history.places[ 2 ].city = 'Marakesh';
						updatedDataEquiv.history.places[ 2 ].country = 'Morocco';
						updatedDataEquiv.isActive = true;
						expect( store.data ).toEqual({
							...expectedValue,
							city3: updatedDataEquiv.history.places[ 2 ].city,
							country3: updatedDataEquiv.history.places[ 2 ].country,
							isActive: updatedDataEquiv.isActive,
							state: updatedDataEquiv
						});
					});
				} );
				test( 'holds an empty object when no renderKeys provided ', async () => {
					mountDriver( createSourceData() )(
						({ streamChannel: store }) => {
							expect( store.data ).toEqual({});
							store.setState({ // can still update state
								isActive: true,
								history: {
									places: {
										2: {
											city: 'Marakesh',
											country: 'Morocco'
										}
									}
								}
							} as unknown as SourceData );
							expect( store.data ).toEqual({});
						}
					);
				} );
			} );
			describe( 'stream.resetState', () => {
				describe( 'when selectorMap is present in the consumer', () => {
					describe( 'and called with own property paths arguments to reset', () => {
						test( 'resets with original slices and removes non-original slices for entries found in property paths', async () => {
							const args = [ 'blatant', 'tags[5]', 'company', 'history.places[2].year', 'xylophone', 'yodellers', 'zenith' ];
							mountDriver( createSourceData(), {
								year3: 'history.places[2].year',
								isActive: 'isActive',
								tag6: 'tags[5]'
							} as const )(({
								context: ctx,
								streamChannel: store
							}) => {
								const isActive2 = !sourceData.isActive;
								ctx.store.setState({
									history: { places: { 2: { year: '3035' } } },
									isActive: isActive2,
									tags: { 5: 'JUST-TESTING' }
								} as unknown as SourceData );
								expect( store.data ).toEqual({
									year3: '3035',
									isActive: isActive2,
									tag6: 'JUST-TESTING'
								});
								expect( ctx.store.getState() ).toEqual({
									...sourceData,
									history: (() => {
										const places = [ ...sourceData.history.places ];
										places[ 2 ] = { ...places[ 2 ], year: '3035' };
										return { ...sourceData.history, places };
									})(),
									isActive: isActive2,
									tags: (() => {
										const tags = [ ...sourceData.tags ];
										tags[ 5 ] = 'JUST-TESTING';
										return tags;
									})()
								});
								store.resetState( args );
								expect( store.data ).toEqual({
									year3: sourceData.history.places[2].year,
									isActive: isActive2,
									tag6: sourceData.tags[ 5 ]
								});
								expect( ctx.store.getState() ).toEqual({
									...sourceData, isActive: isActive2
								});
							});
						} );
					} );
				} );
				describe( 'when selectorMap is NOT present in the consumer', () => {
					describe( 'and called with own property paths arguments to reset', () => {
						test( 'resets with original slices and removes non-original slices for entries found in property paths', async () => {
							const args = [ 'blatant', 'company', 'xylophone', 'yodellers', 'zenith' ];
							mountDriver( createSourceData() )(({
								context: ctx,
								streamChannel: store
							}) => {
								expect( store.data ).toEqual({});
								ctx.store.setState({
									blatant: true,
									company: 'SOME NEW TEST INC.',
									xylophone: 'Ruggedly melodic', 
									yodellers: 'Cartoonishly joyful'
								} as unknown as SourceData );
								expect( store.data ).toEqual({});
								expect( ctx.store.getState() ).toEqual({
									...sourceData,
									blatant: true,
									company: 'SOME NEW TEST INC.',
									xylophone: 'Ruggedly melodic', 
									yodellers: 'Cartoonishly joyful'
								});
								store.resetState( args );
								expect( store.data ).toEqual({});
								expect( ctx.store.getState() ).toEqual( sourceData );
							});
						} );
					} );
					describe( 'and called with NO own property paths arguments to reset', () => {
						test( 'results in no-op', async () => {
							mountDriver( createSourceData() )(({
								context: ctx,
								streamChannel: store
							}) => {
								expect( store.data ).toEqual({});
								ctx.store.setState({
									blatant: true,
									company: 'SOME NEW TEST INC.',
									xylophone: 'Ruggedly melodic', 
									yodellers: 'Cartoonishly joyful'
								} as unknown as SourceData );
								expect( store.data ).toEqual({});
								const alteredState = ctx.store.getState();
								expect( alteredState ).toEqual({
									...sourceData,
									blatant: true,
									company: 'SOME NEW TEST INC.',
									xylophone: 'Ruggedly melodic', 
									yodellers: 'Cartoonishly joyful'
								});
								store.resetState();
								expect( store.data ).toEqual({});
								expect( ctx.store.getState() ).toBe( alteredState );
							});
						} );
					} );
				} );
			} );
		} );
	} );
	describe( 'More on prehooks', () => {
		describe( 'resetState prehook', () => {
			describe( 'when `resetState` prehook does not exist on the context', () => {
				test( 'completes `store.resetState` method call', async () => {
					mountDriver()(({ context: ctx }) => {
						ctx.store.setState( getUpdatePayload() );
						const changeMock = jest.fn();
						ctx.store.subscribe( 'data-updated', changeMock );
						expect( changeMock ).not.toHaveBeenCalled();
						ctx.store.resetState([ FULL_STATE_SELECTOR ]);
						expect( changeMock ).toHaveBeenCalled();
					});
				} );
			} );
			describe( 'when `resetState` prehook exists on the context', () => {
				test( 'is called by the `store.resetState` method', async () => {
					const prehooks = Object.freeze({ resetState: jest.fn().mockReturnValue( false ) });
					mountDriver( undefined, undefined, prehooks )(({
						context: ctx
					}) => {
						const changes = getUpdatePayload();
						ctx.store.setState( changes );
						ctx.store.resetState([ 'age', 'friends[1].name.first', 'name.first' ]);
						expect( prehooks.resetState ).toHaveBeenCalledTimes( 1 );
						expect( prehooks.resetState.mock.calls[ 0 ][ 0 ]).toEqual({
							[ AutoImmutableModule.DELETE_TAG ]: [ 'age', 'friends', 'name' ]
						});
						expect( prehooks.resetState.mock.calls[ 0 ][ 1 ] ).toEqual({
							current: {
								age: ( changes as SourceData ).age,
								name: { first: ( changes as SourceData ).name.first },
								friends: [ undefined, {
									name: {
										first: ( changes as SourceData ).friends[ 1 ].name.first
									}
								} ]
							},
							original: {}
						});
					});
				} );
				test( 'completes `store.setState` method call if `setState` prehook returns TRUTHY', async () => {
					const prehooks = Object.freeze({ resetState: jest.fn().mockReturnValue( true ) });
					mountDriver( undefined, undefined, prehooks )(
						({ context: ctx }) => {
							ctx.store.setState( getUpdatePayload() );
							const changeMock = jest.fn();
							ctx.store.subscribe( 'data-updated', changeMock );
							expect( changeMock ).not.toHaveBeenCalled();
							ctx.store.resetState([ FULL_STATE_SELECTOR ]);
							expect( changeMock ).toHaveBeenCalled();
						}
					)
				} );
				test( 'aborts `store.setState` method call if `setState` prehook returns FALSY', async () => {
					const prehooks = Object.freeze({ resetState: jest.fn().mockReturnValue( false ) });
					mountDriver( undefined, undefined, prehooks )(
						({ context: ctx }) => {
							ctx.store.setState( getUpdatePayload() );
							const changeMock = jest.fn();
							ctx.store.subscribe( 'data-updated', changeMock );
							expect( changeMock ).not.toHaveBeenCalled();
							ctx.store.resetState();
							expect( changeMock ).not.toHaveBeenCalled();
						}
					);
				} );
			} );
		} );
		describe( 'setState prehook', () => {
			describe( 'when `setState` prehook does not exist on the context', () => {
				test( 'completes `store.setState` method call', async () => {
					mountDriver()(({ context: ctx }) => {
						const changeMock = jest.fn();
						ctx.store.subscribe( 'data-updated', changeMock );
						expect( changeMock ).not.toHaveBeenCalled();
						ctx.store.setState( getUpdatePayload() );
						expect( changeMock ).toHaveBeenCalled();
					});
				} );
			} );
			describe( 'when `setState` prehook exists on the context', () => {
				test( 'is called by the `store.setState` method', async () => {
					const prehooks = Object.freeze({ setState: jest.fn().mockReturnValue( false ) });
					mountDriver( undefined, undefined, prehooks )(
						({ context: ctx }) => {
							ctx.store.setState( getUpdatePayload() );
							expect( prehooks.setState ).toHaveBeenCalledTimes( 1 );
							expect( prehooks.setState ).toHaveBeenCalledWith( getUpdatePayload() );
						}
					);
				} );
				test( 'completes `store.setState` method call if `setState` prehook returns TRUTHY', async () => {
					const prehooks = Object.freeze({ setState: jest.fn().mockReturnValue( true ) });
					mountDriver( undefined, undefined, prehooks )(
						({ context: ctx }) => {
							const changeMock = jest.fn();
							ctx.store.subscribe( 'data-updated', changeMock );
							expect( changeMock ).not.toHaveBeenCalled();
							ctx.store.setState( getUpdatePayload() );
							expect( changeMock ).toHaveBeenCalled();
						}
					);
				}, 3e4 );
				test( 'aborts `store.setState` method call if `setState` prehook returns FALSY', async () => {
					const prehooks = Object.freeze({ setState: jest.fn().mockReturnValue( false ) });
					mountDriver( undefined, undefined, prehooks )(
						({ context: ctx }) => {
							const changeMock = jest.fn();
							ctx.store.subscribe( 'data-updated', changeMock );
							expect( changeMock ).not.toHaveBeenCalled();
							ctx.store.setState( getUpdatePayload() );
							expect( changeMock ).not.toHaveBeenCalled();
						}
					);
				} );
			} );
		} );
	} );
	describe( 'properties', () => {
		test( 'receives and furnishes prehooks', () => {
			mountDriver( createSourceData() )(
				({ context: ctx }) => {
					const prehooks = {
						resetState: jest.fn(),
						setState: jest.fn()
					} as unknown as Prehooks<SourceData>;
					ctx.prehooks = prehooks;
					expect( ctx.prehooks ).toBe( prehooks );
					ctx.prehooks = undefined as unknown as Prehooks<SourceData>;
				}
			);
		} );
		test( 'receives and furnishes init data storage', () => {
			mountDriver( createSourceData() )(
				({ context: ctx }) => {
					const storage = {
						getItem: jest.fn(),
						removeItem: jest.fn(),
						setItem: jest.fn()
					} as unknown as IStorage<SourceData>;
					ctx.storage = storage;
					expect( ctx.storage ).toBe( storage );
					ctx.storage = undefined as unknown as IStorage<SourceData>;
				}
			);
		} );
		describe( 'readonly', () => {
			test( 'furnishes access to underlying cache', () => {
				mountDriver( createSourceData() )(
					({ context: ctx }) => {
						expect( ctx.cache ).toBeInstanceOf( AutoImmutableModule.default );
						expect(() => {
							// @ts-expect-error
							ctx.cache = expect.any( AutoImmutableModule.default );
						}).toThrow( 'Cannot set property cache of #<VueEagleEye> which has only a getter' );
					}
				);
			} );
			test( 'furnishes this context active status', () => {
				mountDriver()(({ context: ctx }) => {
					expect( ctx.closed ).toBe( false );
					expect(() => {
						// @ts-expect-error
						ctx.closed = true;
					}).toThrow( 'Cannot set property closed of #<VueEagleEye> which has only a getter' );
					expect( ctx.closed ).toBe( false );
					ctx.dispose();
					expect( ctx.closed ).toBe( true );
				});
			} );
			test( 'furnishes external store reference', () => {
				mountDriver()(({ context: ctx }) => {
					expect( ctx.store ).toEqual({
						getState: expect.any( Function ),
						resetState: expect.any( Function ),
						setState: expect.any( Function ),
						subscribe: expect.any( Function )
					});
					expect(() => {
						// @ts-expect-error
						ctx.store = expect.any( Object );
					}).toThrow( 'Cannot set property store of #<VueEagleEye> which has only a getter' );
				});
			} );
		} );
	} );
} );

function mountDriver<
	T extends State,
	const S extends SelectorMap
>( initData? : T, selctorMap? : S, prehooks? : Prehooks<T>, storage? : IStorage<T> ) {
	const artefact = {} as {
		context : VueEagleEye<T>;
		streamChannel : Store<T, S>;
	};
    const Driver = {
    	setup() {
			artefact.context = createEagleEye( initData, prehooks, storage );
			artefact.streamChannel = artefact.context.stream( selctorMap );
		},
		template: '<div></div>'
    };
	const wrapper = mount( Driver );
	const cleanup = wrapper.unmount.bind( wrapper );
	return ( testFn: ( payload : typeof artefact ) => void ) => {
		testFn( artefact );
		cleanup();
	}
}
