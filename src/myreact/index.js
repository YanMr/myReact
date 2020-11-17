/**
 * @param {类型} type 
 * @param {所有属性} props
 * @param {所有参数} children 
 */
function createElement(type, props, ...children) {
  delete props.__source
  return {
    type,
    props: {
      ...props,
      children: children.map(child => 
         typeof child === "object" ? child : createTextElement(child)
      )
    }
  }
}
/**
 * @param {文本类型的虚拟dom} text 
 */
function createTextElement(text) {
  return {
    type: 'TEXT',
    props: {
      nodeValue: text,
      children: []
    }
  }
}

/**
 *
 *通过虚拟dom 新建dom元素
 * @param {虚拟dom} vdom
 */
function createDom(vdom) {
  const dom = vdom.type === "TEXT"
  ? document.createTextNode("")
  :  document.createElement(vdom.type);
  // 设置 元素属性
  // Object.keys(vdom.props).filter(key => key !== 'children')
  // .forEach(name => {
  //   dom[name] = vdom.props[name]
  // })
  updateDom(dom, {}, vdom.props)
  return dom
}
/**
 *
 *
 * @param {更新的节点} dom
 * @param {上一个节点(老节点)} prevProps
 * @param {下一个节点(新节点，需要更新的数据)} nextProps
 */
function updateDom(dom, prevProps, nextProps) {
  // 1.需要规避children属性
  // 2.老的存在就取消掉
  // 3.新的存在就新增 这里并没有做新老相等的判定
  // @todo 还有很多的兼容性问题，因为还有很多事件不兼容
  Object.keys(prevProps)
  .filter(name => name !== "children")
  .filter(name => !(name in nextProps))
  .forEach(name => {
    if (name.slice(0,2) === 'on') {
      // onClick = click
      dom.removeEventListener(name.slice(2).toLowerCase(), prevProps[name], false)
    } else {
      dom[name] = ''
    }
  })

  Object.keys(nextProps)
  .filter(name => name !== 'children')
  .forEach(name => {
    if (name.slice(0,2) === 'on') {
      // onClick = click
      dom.addEventListener(name.slice(2).toLowerCase(), nextProps[name], false)
    } else {
      dom[name] =  nextProps[name]
    }
  })
}


function commitRoot() {
  deletions.forEach(commitWork)  // 循环删除delletions中保存的删除节点
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  // 防止重复工作
  wipRoot = null
}

function commitWork(fiber) {
  if(!fiber) {
    return
  }
  // const domParent = fiber.parent.dom
  // 向上递归查找
  let domParentFiber = fiber.parent
  while(!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom
  // effectTag是替换并且父节点存在 
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    // 更新dom
    // fiber.dom 根据他的dom节点   fiber.base.props老的属性数据   fiber.props  新的属性数据
    updateDom(
      fiber.dom,
      fiber.base.props,
      fiber.props
      )
  } else if(fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent)
    // domParent.removeChild(fiber.dom)
  }
  // domParent.appendChild(fiber.dom)
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

/**
 * @param {虚拟dom} vdom
 * @param {容器} container
 */
function render(vdom, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [vdom]
    },
    base: currentRoot //存储上一个中断根节点
  }
  //管理我们删除任务，定义个空数组
  deletions = []
  nextUnitOfWork = wipRoot
  // container.innerHTML = `<pre>${JSON.stringify(vdom, null, 2) }</pre>`
  // vdom.props.children.forEach(child => {
  //   render(child, dom)
  // })
  
  // container.appendChild(dom)
}

//下一个单元任务
// render会初始化第一个任务
let nextUnitOfWork = null
// fiber的根节点
let wipRoot = null
// 保存中断节点
let currentRoot = null
// 保存删除节点的数组
let deletions = null
//调度我们的diff或者渲染任务
function workLoop(deadLine) {
  // 有下一个任务，并且当前帧还没有结束
  while(nextUnitOfWork && deadLine.timeRemaining()>1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  if (!nextUnitOfWork && wipRoot) {
    // 没有任务了,并且根节点还在
    commitRoot()
  }
  // 当前帧结束，但是还有下一个任务，所以要执行下面的函数
  requestIdleCallback(workLoop)
}

// 启动浏览器空闲时间渲染
requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
  // 判断是不是函数组件
  const isFunctionComponent = fiber.type instanceof  Function
  if (isFunctionComponent) {
     updateFunctionComponent(fiber)
  }else {
    // dom
    updateHostComponent(fiber)
  }

   // 找下一个任务
  // 先找子元素
  if (fiber.child) {
    return fiber.child
  }
  // 没有子元素，找兄弟元素

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    // 没有兄弟元素了，找父元素
    nextFiber = nextFiber.parent
  }
}

function useState(init) {
  const oldHooks = wipFiber.base && wipFiber.base.hooks && wipFiber.base.hooks[hookIndex]
  const hook = {
    state: oldHooks ? oldHooks.state : init, //存储值
    queue: [] //修改值
  }
  const actions = oldHooks ? oldHooks.queue : []
  actions.forEach(action => {
    hook.state = action
  })
  const setState = action => {
     // 目前action 只支持普通的数据结构
     hook.queue.push(action)
     wipRoot = {
       dom: currentRoot.dom, 
       props: currentRoot.props,
       base: currentRoot
     }
     nextUnitOfWork = wipRoot
     deletions = []
  }
  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}
 // 当前工作的Fiber
let wipFiber = null
// 多个hook索引标识
let hookIndex = null
 
function updateFunctionComponent(fiber) {
  wipFiber = fiber
  hookIndex = 0
  // 存储组件内部hooks的数据
  wipFiber.hooks = []
  // fiber.type 是一个函数   children是一个数组
  const children = [fiber.type(fiber.props)]
  // 开始渲染 
  reconcileChildren(fiber, children)
}
// 表示正常的各个节点更新
function updateHostComponent(fiber) {
    // 获取下一个任务
  // 根据当前的任务，获取下一个任务
  if (!fiber.dom) {
    // 不是入口
    fiber.dom = createDom(fiber)
  }
  // 真实的dom操作 
  // if (fiber.parent) {
  //   fiber.parent.dom.appendChild(fiber.dom)
  // }

  // 当前根节点的子元素
  // const elements = fiber.props.children

  // 调和我们的子元素
  reconcileChildren(fiber, fiber.props.children)
}

  function reconcileChildren(wipFiber, elements) {
  // 构建成fiber结构
  let index = 0
  let oldFiber = wipFiber.base && wipFiber.base.child
  let prevSibling = null
  while(index < elements.length || oldFiber != null) {
  // while(index < elements.length) {
    let element = elements[index]
    let newFiber = null
    // 对比oldfiber的状态和当前element
    // 新老类型都要一样
    const sameType = oldFiber && element && element.type === oldFiber.type
    // 新老类型都一样
    if(sameType) {
      // 更新 复用节点
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        base: oldFiber,
        effectTag: 'UPDATE',
      }
    }
    // 新老类型不一样并且新的节点都存在
    if(!sameType && element) {
      // 替换节点
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null, // 替换节点之前没有dom
        parent: wipFiber,
        base: null, // 替换节点没有之前的状态
        effectTag: 'PLACEMENT',
      }
    }
    // 新老节点不一样并且老节点不存在
    if(!sameType && oldFiber) {
      // 删除节点
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }
    if (index === 0) {
      // 第一个元素，是父元素fiber的child属性
      wipFiber.child = newFiber
    } else if(element) {
      // 其他的是以兄弟元素的形式存在
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber
    index++
    // fiber 基本结构构建完毕
  }
 
}

// fiber ={
//   dom: 真实dom
//   parent: 父级元素
//   child: 第一个子元素
//   slibing：兄弟
// }

class Component {
  constructor(props) {
    this.props = props
  }
}

// 把其转成一个函数式的组件，利用hooks的一个功能
function transfer(Component) {
 return function (props) {
  const  component = new Component(props)
  let [state, setState] = useState(component.state)
  component.props = props
  component.state = state
  component.setState = setState
  return component.render()
 }
}

export default {
  createElement,
  render,
  useState,
  Component,
  transfer
}