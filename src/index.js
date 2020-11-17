// import React from 'react';
// import ReactDOM from 'react-dom';
import React from "./myreact"
import App1 from "./App"
let ReactDOM = React;

function App(props) {
  const [count, setCount] = React.useState(1)
  return (
    <div>
      <h1>哈喽，{props.title}, {count}</h1>
      <button onClick={()=> setCount(count + 1)}>累加</button>
      <p><App1></App1></p>
    </div>
  )
}

let element = <App title="myReact"></App>
ReactDOM.render(element, document.getElementById('root'))