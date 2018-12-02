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

class Watcher {
    constructor(update) {
        this.update = update;
    }
}

// set notify;
// get addSub;

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

function Vue(options) {
    this._init(options);
    return this;
}

Vue.prototype._init = function(options) {
    let vm = this;
    vm.$options = options;
    initState(vm);
    mount(vm);
}

function initState(vm) {
    initData(vm);
    initComputed(vm);
}

function initData(vm) {
    let data = vm.$options.data;
    data = typeof data === 'function' ? data() : data;
    Object.keys(data).forEach(key => {
        defineReactive(data, key);
    });
    // 把 data 的属性代理到 vm 实例
    proxy(data, vm);
}

function proxy(source, target) {
    Object.keys(source).forEach(key => {
        Object.defineProperty(target, key, {
            get: function() {
                return source[key];
            },
            set: function(val) {
                source[key] = val;
            }
        })
    })
}

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

// Watcher
// update
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
