## Vue 源码(一)：响应式原理
> 相关文章网上已经很多了，趁 3.0 没出跟风打个卡

### 前言
本文只做简单介绍，结合代码食用更佳：[github/vue-learn-source-code](https://github.com/reclay/vue-learn-source-code.git)  
效果预览：[github pages](https://reclay.github.io/vue-learn-source-code/)  

### Object.defineProperty
defineProperty 让我们可以劫持某个属性的 getter 和 setter，举个例子：

```javascript
var person = {
    firstName: 'meimei',
    lastName: 'han'
};
Object.defineProperty(person, 'fullName', {
    get() {
        return this.lastName + ' ' + this.firstName;
    },
    set(val) {
        let arr = val.split(' ');
        this.lastName = arr[0];
        this.firstName = arr[1];
    }
});
```
劫持 fullName 后，改变 firstName 或 lastName 会更新 fullName，反之亦然

### 目标
本文的目标是仿造 vue 实现改变数据后更新 dom，让以下代码能够 work：
```html
<div id="app">
    <p>firstName: {{firstName}}</p>
    <p>lastName: {{lastName}}</p>
    <p>fullName: {{fullName}}</p>
</div>
<script src="./vue.js"></script>
<script>
    let vm = new Vue({
        el: '#app',
        data() {
            return {
                firstName: 'meimei',
                lastName: 'han'
            };
        },
        computed: {
            fullName: {
                get: function() {
                    return this.lastName + ' ' + this.firstName;
                },
                set: function(val) {
                    let arr = val.split(' ');
                    this.lastName = arr[0];
                    this.firstName = arr[1];
                }
            }
        }
    });
</script>
```

### 观察者模式

我们要做的是数据变化后去更新 dom，观察者模式很适合  
数据只需要收集依赖，当数据变化通知依赖更新即可，先建一个类描述这件事：  

```javascript
class Dep {
    constructor() {
        this.subs=[]
    }
    addSub(item) {
        this.subs.push(item);
    }
    notify() {
        this.subs.forEach(item => {
            item.update();
        });
    }
}
```

再细想一下，dom 依赖 data，则在获取 dom 的过程中需要用到 data 的 get，在 data get 时收集依赖即可，set data 时执行 dom 的 update  
get data 时需要记录依赖 data 的数据，给 class Dep 增加一个属性 target 作为记录工具，结合 defineProperty 实现如下：

```javascript
Dep.target = undefined;
function defineReactive(obj, key) {
    let dep = new Dep();
    let val = obj[key];
    Object.defineProperty(obj, key, {
        get: function() {
            if (Dep.target) {
                // get 中收集依赖
                dep.addSub(Dep.target);
            }
            return val;
        },
        set: function(value) {
            val = value;
            // set 中触发更新
            dep.notify();
        }
    })
}
```
工具已备齐，接下来就是遍历 data 的属性，用 defineReactive 走一遍

### data, computed, dom 的依赖关系
解析 dom 会用到 data 和 computed，computed 的 get 会用到 data

1. 遍历 data

```javascript
function initData(vm) {
    let data = vm.$options.data;
    data = typeof data === 'function' ? data() : data;
    Object.keys(data).forEach(key => {
        defineReactive(data, key);
    });
    // 把 data 的属性代理到 vm 实例
    proxy(data, vm);
}
```

2. 遍历 computed

```javascript
function initComputed(vm) {
    let computed = vm.$options.computed;
    let defaultSetter = function(key) {
        console.error(this, ' has no setter for ', key)
    }
    Object.keys(computed).forEach(key => {
        let getter = typeof computed[key] === 'function' ? computed[key] : computed[key].get;
        let setter = typeof computed[key] === 'function' ? defaultSetter.bind(computed) : computed[key].set;
        Object.defineProperty(computed, key, {
            get: getter.bind(vm),
            set: setter.bind(vm)
        })
    })
    // 把 computed 的属性代理到 vm 实例
    proxy(computed, vm);
}
```

3. 解析 dom

```javascript
function mount(vm) {
    let update = compile(vm);
    let watcher = new Watcher(update);
    // 把 target 标为 dom
    Dep.target = watcher;
    update();
    Dep.target = undefined;
}

function compile(vm) {
    let el = vm.$options.el;
    el = document.querySelector(el);
    vm.$el = el;
    let innerHTML = el.innerHTML;
    let getter = function() {
        return innerHTML.replace(/{{(.*?)}}/g, function() {
            // 这里用到了 data computed 的 get，收集了依赖
            return vm[arguments[1]]
        });
    };
    let update = function() {
        let iHTML = getter();
        el.innerHTML = iHTML;
    }
    return update;
}
```
### 多说一句
在收集依赖时，我们给 Dep 这个 class 增加一个属性 target，在 vue 中还结合了 targetStack。这种收集方式稍微管理不慎就可能存在 bug，在另一篇文章有提过：[熟悉 Vue ？你能解释这个死循环吗？](https://juejin.im/post/5b8a18f36fb9a019bf46bd65)。  
为自己的填坑喝彩~
