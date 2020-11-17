import React from './myreact'

class App extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      age: 18,
    }
  }
  handleClick=() => {
    this.setState({
      age: this.state.age +1
    })
  }
  render() {
    return <div>
      <h1>我今年{this.state.age}岁啦</h1>
      <button onclick={this.handleClick }>过生日</button>
    </div>
  }
}

export default React.transfer(App)