import React, { Fragment } from 'react'
import { render } from 'react-dom'
import { Observable } from 'rxjs'
import { interval } from 'rxjs/observable/interval'
import { zip } from 'rxjs/observable/zip'
import { from } from 'rxjs/observable/from'
import config from 'recompose/rxjsObservableConfig'
import {
  setObservableConfig,
  componentFromStream,
  createEventHandler,
  mapPropsStream,
  compose,
} from 'recompose'
import { view, set, lensProp, lensPath } from 'ramda'


setObservableConfig(config)

const typewriter = (lens) => {
  return mapPropsStream((props$) => {
    return props$.switchMap(
      (props) =>
        zip(
          from(view(lens, props)),
          interval(100),
          (letter) => letter
        )
        .scan((acc, curr) => acc + curr),
      (props, name) => set(lens, name, props)
    )
  })
}

const DateDisplay = (props) => (
  <h1>{props.date}</h1>
)

const DateTypewriter = typewriter(
  lensProp('date')
)(DateDisplay)

const count = mapPropsStream((props$) => {
  const { stream: onInc$, handler: onInc } = createEventHandler()
  const { stream: onDec$, handler: onDec } = createEventHandler()
  return props$.switchMap(
    (props) => Observable
      .merge(onInc$.mapTo(1), onDec$.mapTo(-1))
      .startWith(0)
      .scan((acc, curr) => acc + curr),
    (props, count) => ({ ...props, count, onInc, onDec }),
  )
})

const load = mapPropsStream((props$) => {
  return props$.switchMap(
    (props) => Observable
      .ajax(`https://swapi.co/api/people/${props.count}`)
      .pluck('response')
      .startWith({ name: 'loading...' })
      .catch(err => Observable.of({ name: 'Not found' })),
    (props, person) => ({ ...props, person }),
  )
})

const Counter = (props) => (
  <div>
    <button onClick={props.onInc}>+</button>
    <button onClick={props.onDec}>-</button>
    <h3>{props.count}</h3>
    <h1>{props.person.name}</h1>
  </div>
)

const CounterWithPersonLoader = compose(
  count,
  load,
  typewriter(
    lensPath(['person', 'name'])
  )
)(Counter)

const App = () => (
  <Fragment>
    <DateTypewriter date={new Date().toDateString()} />
    <CounterWithPersonLoader />
  </Fragment>
)

render(<App />, document.getElementById('root'))
