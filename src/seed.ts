import { BLOCK_WIDTH_PRESET } from './types'
import type { NotePage, NoteSection, Notebook, PageWidth } from './types'

const NOW = Date.now()

function page(
  id: string,
  title: string,
  markdown: string,
  minutesAgo: number,
  width: PageWidth = 'wide',
): NotePage {
  const time = NOW - minutesAgo * 60_000
  // 正文不再重复页面标题，标题由页面头部单独维护
  const body = markdown.replace(/^#\s+[^\n]*\n+/, '')
  return {
    id,
    title,
    blocks: [
      {
        id: `${id}-b1`,
        type: 'markdown',
        markdown: body,
        x: 0,
        y: 0,
        width: BLOCK_WIDTH_PRESET[width],
      },
    ],
    createdAt: time,
    updatedAt: time,
    zoom: 100,
    width,
  }
}

const virtualFunction = [
  '# 12.1 虚函数',
  '',
  '> 本页整理自第 12 章：公有继承里的虚函数接口与实现。',
  '',
  '## 1 公有继承',
  '',
  '公有继承包含两部分：一是「虚函数接口」，二是「虚函数实现」。',
  '',
  '```cpp',
  'class Shape {',
  'public:',
  '    virtual void Draw() const = 0;        // 纯虚函数：只声明不实现',
  '    virtual void Error(const char* msg);  // 普通虚函数：基类提供默认实现',
  '};',
  '',
  'class Rectangle : public Shape {',
  'public:',
  '    void Draw() const override;',
  '};',
  '```',
  '',
  '| 类型 | 是否有实现 | 派生类是否必须重写 |',
  '| --- | --- | --- |',
  '| 纯虚函数 | 否 | 是 |',
  '| 普通虚函数 | 是 | 否 |',
  '',
  '## 1.1 纯虚函数（pure virtual）',
  '',
  '纯虚函数在基类中声明，在基类中没有实现，派生类必须实现，否则派生类仍然是抽象类。',
  '',
  '```cpp',
  'Shape* ps = new Rectangle;   // 抽象类不能直接实例化',
  'ps->Draw();                  // 动态绑定，实际调用 Rectangle::Draw',
  '```',
  '',
  '## 1.2 普通虚函数',
  '',
  '普通虚函数在基类中给出默认实现，派生类可以覆盖，也可以直接继承使用。',
].join('\n')

const explicitKeyword = [
  '# 12.2 explicit 关键字',
  '',
  '## 为什么需要 explicit',
  '',
  '`explicit` 用来抑制构造函数或转换函数的隐式类型转换，避免「看起来没写错」的类型转换。',
  '',
  '```cpp',
  'class Foo {',
  'public:',
  '    explicit Foo(int n);    // 禁止 Foo f = 10; 这种隐式转换',
  '    explicit operator bool() const;',
  '};',
  '',
  'void bar(Foo f);',
  'bar(10);                    // 编译失败，必须写成 bar(Foo(10))',
  '```',
  '',
  '- 单参数构造函数建议默认加 `explicit`',
  '- 转换运算符也建议加 `explicit`，避免意外参与隐式转换',
  '- 拷贝构造、移动构造不要加 `explicit`',
].join('\n')

const mutableKeyword = [
  '# 12.3 mutable 关键字',
  '',
  '`mutable` 允许在 `const` 成员函数中修改被标记的成员变量，常用于缓存和计数器。',
  '',
  '```cpp',
  'class Cache {',
  '    mutable int hitCount = 0;',
  'public:',
  '    int Get() const {',
  '        ++hitCount;   // 合法：mutable 成员可以在 const 函数中修改',
  '        return 0;',
  '    }',
  '};',
  '```',
  '',
  '> `mutable` 不是「绕过 const」，它表达的是逻辑上不改变对象对外可见的状态。',
].join('\n')

const staticMembers = [
  '# 12.4 static 成员与全局函数',
  '',
  '## 静态成员',
  '',
  '- 属于类而不是某个对象，所有实例共享一份',
  '- 静态成员函数没有 `this` 指针',
  '- 需要在类外定义（C++17 起可用 `inline static` 直接在类内定义）',
  '',
  '```cpp',
  'class Counter {',
  'public:',
  '    static int total;',
  '    static int GetTotal() { return total; }',
  '};',
  '',
  'int Counter::total = 0;',
  '```',
  '',
  '## 静态局部变量',
  '',
  '函数内的静态变量在第一次执行到定义处时初始化，生命周期持续到进程结束。',
].join('\n')

const externKeyword = [
  '# 12.5 extern 变量声明',
  '',
  '`extern` 声明的变量定义在别的翻译单元，链接期解析地址。',
  '',
  '```cpp',
  '// config.h',
  'extern int gConfigValue;',
  '',
  '// config.cpp',
  'int gConfigValue = 42;',
  '```',
  '',
  '- 头文件里只放声明，定义放到 `.cpp`',
  '- 配合 `inline` 或 `constexpr` 可以避免重复定义问题',
].join('\n')

const memoryLayout = [
  '# 12.6 进程的内存分配',
  '',
  '| 区域 | 内容 | 生命周期 |',
  '| --- | --- | --- |',
  '| 代码区 | 机器指令 | 整个进程 |',
  '| 全局 / 静态区 | 全局变量、static | 整个进程 |',
  '| 栈 | 局部变量、函数调用 | 随作用域自动回收 |',
  '| 堆 | new / malloc 分配 | 手动释放 |',
  '',
  '> 栈向下增长，堆向上增长，中间是尚未分配的地址空间。',
  '',
  '```cpp',
  'int g = 0;              // 全局区',
  '',
  'void f() {',
  '    int a = 1;          // 栈',
  '    int* p = new int(2); // 堆，需要 delete',
  '}',
  '```',
].join('\n')

const alignment = [
  '# 12.7 内存对齐与对象理解',
  '',
  '编译器按成员中最大的对齐值补齐，对象的 `sizeof` 通常大于成员大小之和。',
  '',
  '```cpp',
  'struct A { char c; int i; };      // sizeof = 8',
  'struct B { char c; double d; };   // sizeof = 16',
  '```',
  '',
  '调整成员顺序可以减少填充字节：把小的成员放在一起。',
].join('\n')

const singleton = [
  '# 12.8 单例模式（懒汉与饿汉）',
  '',
  '```cpp',
  'class Singleton {',
  'public:',
  '    static Singleton& Instance() {',
  '        static Singleton inst;   // C++11 起局部静态变量的初始化是线程安全的',
  '        return inst;',
  '    }',
  '',
  'private:',
  '    Singleton() = default;',
  '    Singleton(const Singleton&) = delete;',
  '};',
  '```',
  '',
  '- 饿汉模式：程序启动时就构造，简单但可能拖慢启动',
  '- 懒汉模式：第一次使用时构造，C++11 之后推荐局部静态变量写法',
].join('\n')

function section(
  id: string,
  name: string,
  color: string,
  pages: NotePage[],
): NoteSection {
  return { id, name, color, pages }
}

export function createSeedNotebook(): Notebook {
  return {
    id: 'notebook-hqq',
    name: 'HQQ',
    sections: [
      section('sec-career', '00-个人职业', '#6F6FFF', [
        page(
          'page-career-plan',
          '2026 年职业规划',
          [
            '# 2026 年职业规划',
            '',
            '## 目标',
            '',
            '- 把 C++ 底层与图形学补到能独立做项目的程度',
            '- 每周至少整理 3 篇可复用的笔记',
            '',
            '## 季度拆解',
            '',
            '| 季度 | 主题 | 产出 |',
            '| --- | --- | --- |',
            '| Q1 | C++ 对象模型 | 12 篇笔记 |',
          ].join('\n'),
          900,
        ),
      ]),
      section('sec-quant', '01-量化', '#0D9488', [
        page(
          'page-quant-backtest',
          '因子回测流程',
          [
            '# 因子回测流程',
            '',
            '1. 清洗行情数据，统一复权口径',
            '2. 计算因子暴露，做去极值与标准化',
            '3. 分层回测，观察单调性与换手率',
            '',
            '> 先看 IC 均值和 ICIR，再看多空组合净值。',
          ].join('\n'),
          760,
        ),
      ]),
      section(
        'sec-cpp',
        '02-C++',
        '#2563EB',
        [
          page('page-12-1', '12.1 虚函数', virtualFunction, 120),
          page('page-12-2', '12.2 explicit 关键字', explicitKeyword, 180),
          page('page-12-3', '12.3 mutable 关键字', mutableKeyword, 260),
          page('page-12-4', '12.4 static 成员与全局函数', staticMembers, 320),
          page('page-12-5', '12.5 extern 变量声明', externKeyword, 420),
          page('page-12-6', '12.6 进程的内存分配', memoryLayout, 520),
          page('page-12-7', '12.7 内存对齐与对象理解', alignment, 640),
          page('page-12-8', '12.8 单例模式', singleton, 820),
        ],
      ),
      section('sec-ai', '03-AI', '#C2410C', [
        page(
          'page-ai-attention',
          'Transformer 注意力机制',
          [
            '# Transformer 注意力机制',
            '',
            '注意力本质是一次带权重的信息聚合，权重由 Query 与 Key 的相似度决定。',
            '',
            '```python',
            'score = torch.softmax(q @ k.T / sqrt(d), dim=-1)',
            'out = score @ v',
            '```',
            '',
            '- `d` 是每个头的维度，用来把点积方差拉回 1',
            '- 多头的作用是让不同的子空间关注不同模式',
          ].join('\n'),
          1100,
        ),
      ]),
      section('sec-graphics', '05-计算机图形学', '#7C3AED', [
        page(
          'page-graphics-bezier',
          'Bezier 曲线推导',
          [
            '# Bezier 曲线推导',
            '',
            '三次 Bezier 曲线可以写成 Bernstein 基函数的线性组合：',
            '',
            '```cpp',
            'P(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3',
            '```',
            '',
            '权重的四项和恒为 1，保证曲线始终落在控制点的凸包内。',
          ].join('\n'),
          1400,
        ),
      ]),
      section('sec-pattern', '07-设计模式', '#DB2777', [
        page(
          'page-pattern-observer',
          '观察者模式',
          [
            '# 观察者模式',
            '',
            '主题维护观察者列表，状态变化时逐个通知；观察者只依赖抽象接口。',
            '',
            '- 优点：解耦发布方与订阅方',
            '- 注意：通知顺序不稳定，避免在回调里修改观察者列表',
          ].join('\n'),
          1600,
        ),
      ]),
      section('sec-occ', '09-OpenCascade', '#0891B2', [
        page(
          'page-occ-topods',
          'TopoDS 数据结构',
          [
            '# TopoDS 数据结构',
            '',
            'OpenCascade 用 TopoDS_Shape 表示拓扑形状，底层通过句柄共享几何数据。',
            '',
            '| 层级 | 类型 |',
            '| --- | --- |',
            '| 体 | TopoDS_Solid |',
            '| 面 | TopoDS_Face |',
            '| 边 | TopoDS_Edge |',
          ].join('\n'),
          1800,
        ),
      ]),
      section('sec-freecad', '10-FreeCAD', '#059669', [
        page(
          'page-freecad-sketch',
          'Sketch 约束求解',
          [
            '# Sketch 约束求解',
            '',
            'Sketcher 用约束方程求解几何自由度，常见约束有水平、垂直、相切、尺寸。',
            '',
            '> 约束过多会导致过约束（redundant constraints），求解器会报错。',
          ].join('\n'),
          2000,
        ),
      ]),
    ],
  }
}
