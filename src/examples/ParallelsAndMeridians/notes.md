# ParallelsAndMeridians

学习笔记：

- 这是一个新创建的 Cesium Sandcastle 示例。
- 在此处记录您的学习心得、关键 API 或参数配置。

---

### <mark>makeParallelsRecursive 这个函数的 result = southernLines.concat(result, northernLines); 怎么理解？既然都 push 到 result 了，为啥还要 concat？</mark>

Viewed index.tsx:200-350

在函数 [makeParallelsRecursive](file:///c:/Users/11690/Documents/GitHub/Cesium_Sandcastle_Explain/src/examples/ParallelsAndMeridians/index.tsx#L269-L291) 中，这行代码：

```javascript
result = southernLines.concat(result, northernLines);
```

其核心作用是为了**保证生成的纬线在数组中是严格按照“从南到北”（即纬度从低到高）的顺序排列的**，并且**将嵌套的递归结果扁平化**。

我们可以把这段逻辑拆解来看：

### 1. 只有当前区间的“中点线”被 `push` 了

在函数开头：

```javascript
let result = [];
const midpoint = (minLatitude + maxLatitude) / 2;
result.push(parallel(midpoint, color)); // 此时 result 数组里只有当前这一条“中点纬线”：[midpointLine]
```

这里只将当前区间的中心纬线（例如第一次递归时的赤道 $0^\circ$）放入了 `result`。

### 2. 递归生成的子区域纬线没有被 `push`

`southernLines`（南半部纬线）和 `northernLines`（北半部纬线）是通过递归调用得到的两个**独立的数组**。它们并没有被 `push` 到当前的 `result` 数组中。

### 3. 为什么选择 `concat` 而不是 `push`？

在地理上，这三部分纬线的位置关系是：
$$\text{南半部纬线 (southernLines)} \quad < \quad \text{中点线 (result)} \quad < \quad \text{北半部纬线 (northernLines)}$$

为了让最终返回的数组也是按这个顺序排列的，需要将它们拼接为：
`[...southernLines, midpointLine, ...northernLines]`

- **如果使用 `concat`**：
  `southernLines.concat(result, northernLines)` 会依次将 `southernLines` 数组、包含中点线的 `result` 数组、以及 `northernLines` 数组连接起来，生成一个全新且扁平的数组，完美保持了**由南到北**的地理顺序。
- **如果使用 `push`**：
  - 若直接 `result.push(southernLines, northernLines)`，会导致数组嵌套（如 `[midpointLine, Array(x), Array(y)]`），而不是一个一维的实体数组。
  - 即使使用扩展运算符 `result.push(...southernLines, ...northernLines)`，由于中点线已经事先被 `push` 进去了，最终结果会变成 `[midpointLine, ...southernLines, ...northernLines]`。这就意味着中点线（如 $0^\circ$）会排在数组最前面，后面跟着南边的线（如 $-45^\circ$ 等）和北边的线（如 $45^\circ$ 等），从而**打乱了从南到北的顺序**。

### 总结

这里使用 `concat` 的精妙之处在于：**它利用递归的回溯过程，自然地实现了类似二叉树“中序遍历”的效果**，从而确保最终输出的纬线数组是严格在地理位置上**从南到北（从小到大）有序**的。

---

### <mark>你说 递归生成的子区域纬线没有被 push ，那递归调用不执行 result.push(parallel(midpoint, color)); 吗？</mark>

---

Viewed index.tsx:259-292

我之前的表述可能有些简略，导致了误解。你的直觉很敏锐：**在子递归调用中，确实会执行 `result.push(parallel(midpoint, color))`**。

但关键在于，**每一次函数调用都有自己独立、局部的 `result` 变量（作用域隔离）**。

下面通过一个具体的例子（假设 `depth = 1`）来走一遍调用过程，你就完全明白了：

我们调用 `makeParallelsRecursive(-90, 90, 1, color)`：

### 第一步：进入第 1 层（父调用，计算 $-90^\circ$ 到 $90^\circ$）

1. 在父调用中，创建了一个局部的空数组 `result = []`。
2. 计算中点 $0^\circ$，执行 `result.push`。此时父调用的 `result` 数组是：
   `[ 0°纬线 ]`
3. 因为 `depth = 1 > 0`，进入 `if` 条件，开始调用子递归。

---

### 第二步：进入第 2 层子调用 A（计算南半部：$-90^\circ$ 到 $0^\circ$）

1. **这是另一个全新的函数执行上下文**。它也创建了自己的局部变量 `result = []`（与父调用的 `result` 互不干扰）。
2. 计算中点 $-45^\circ$，执行 `result.push`。此时这个子调用的局部 `result` 是：
   `[ -45°纬线 ]`
3. 因为此时 `depth` 变为了 `0`，不满足 `depth > 0` 条件，直接执行 `return result;`。
4. **父调用**收到了这个返回值，并将其赋值给局部变量 `southernLines`。
   此时父调用里的 `southernLines` 变量就是 `[ -45°纬线 ]`。

---

### 第三步：进入第 2 层子调用 B（计算北半部：$0^\circ$ 到 $90^\circ$）

1. 同样，它在自己的作用域里创建了局部的 `result = []`。
2. 计算中点 $45^\circ$，执行 `result.push`。此时这个子调用的局部 `result` 是：
   `[ 45°纬线 ]`
3. `depth` 为 `0`，直接 `return result;`。
4. **父调用**收到返回值，将其赋值给局部变量 `northernLines`。
   此时父调用里的 `northernLines` 变量就是 `[ 45°纬线 ]`。

---

### 第四步：回到第 1 层（父调用）继续执行拼接

现在，父调用的作用域里拥有这三个局部变量：

- `southernLines` = `[ -45°纬线 ]` （来自子调用 A 的返回）
- `result` = `[ 0°纬线 ]` （父调用自己第一步 push 进去的）
- `northernLines` = `[ 45°纬线 ]` （来自子调用 B 的返回）

然后，父调用执行：

```javascript
result = southernLines.concat(result, northernLines);
```

把它们拼接起来，父调用的 `result` 变量被更新为：
`[ -45°纬线, 0°纬线, 45°纬线 ]`

---

### 总结

你说的很对，每个子递归确实都执行了它自己的 `result.push`。

但对**当前的父调用**来说，子递归产生的线在返回之前只存在于子函数的内部。父函数必须通过 `southernLines.concat(result, northernLines)`，才能把**子函数返回出来的数组**与**自己持有的中点线**拼接在一起。

---

### <mark>(longitude + 180) % 360 是什么操作？为什么取余这么重要？有哪些经典的使用场景？</mark>

Edited notes.md
Edited index.tsx
Edited index.tsx
Edited index.tsx
Edited index.tsx
Edited index.tsx
Edited index.tsx
Edited index.tsx
Viewed index.tsx:388-421
Viewed index.tsx:422-470

在地理信息系统（GIS）、游戏开发和计算机图形学中，`%`（取余/求模）是一个极其核心的数学工具。下面我们来深度剖析 `(longitude + 180) % 360` 这一操作的本质、重要性以及它的经典应用场景。

---

### 一、 `(longitude + 180) % 360` 到底是什么操作？

这个公式的作用是：**计算地球上任意经度点的“对跖经度”（即地球正背面的经度），并确保计算结果落在合法的 $[0^\circ, 360^\circ)$ 范围内。**

#### 1. 为什么要 `+ 180`？

地球是一个球体，经度范围是 $360^\circ$。一个点的“正背面”（对跖点）在地理上与它正好相差半个圆周，即 $180^\circ$。所以要先加上 $180^\circ$。

#### 2. 为什么要 `% 360`？

在 JS 中，经度的标准范围一般是 $[-180^\circ, 180^\circ]$。
当我们 `+ 180` 后：

- 如果原经度是负数（西经，如 $-100^\circ$）：$-100 + 180 = 80$。不需要取余，它已经是合法的东经 $80^\circ$ 了。
- 如果原经度是正数（东经，如 $100^\circ$）：$100 + 180 = 280$。因为 $280^\circ$ 超过了 $180^\circ$，在某些系统里这属于“越界”经度。
- **通过 `% 360`**，我们将所有结果限制在 $[0, 360)$ 之间。
  - $80 \pmod{360} = 80$
  - $280 \pmod{360} = 280$

_注：Cesium 具有自动归一化（Normalize）功能，传入 $[0, 360)$ 的角度（如 $280^\circ$）时，它在内部会自动将其转换为等价的 $[-180, 180]$ 范围（即 $280^\circ - 360^\circ = -80^\circ$），因此这个公式在 Cesium 中能完美运行。_

---

### 二、 为什么取余（%）这么重要？

取余操作在数学上代表了**周期性（Modulus Arithmetic）**。它的核心价值在于：

1. **将“无限”映射到“有限”**：
   在数轴上，数值可以无限大。但很多物理世界的事物是**循环**的（如圆周、时钟、星期）。取余可以将一个无限增长的数值限制在一个安全的、循环的有限区间内，**防止数值溢出**。
2. **表达“环状结构”**：
   当物体走到终点时，能自动回到起点。例如圆周的 $360^\circ$ 和 $0^\circ$ 是重合的，通过 `% 360` 可以把 $361^\circ$ 自动折算为 $1^\circ$。

---

### 三、 经典的使用场景

取余在编程中有非常广泛的经典应用，主要可以归纳为以下四大类：

#### 1. 地图与地理信息系统（GIS）

- **地图无限水平滚动（World Wrapping）**：
  在二维地图（如 OpenLayers, Leaflet）中，用户可以一直往右拖动地图。经度会变成 $190^\circ, 370^\circ, 730^\circ \dots$。
  为了计算当前屏幕上应该加载哪张地图瓦片（Tile），系统会使用 `(longitude + 180) % 360 - 180`，把任意经度投影回 $[-180, 180]$ 的标准区间。

#### 2. 游戏开发与计算机图形学

- **角度与旋转归一化**：
  在控制角色或摄像机旋转时，角度累加可能变成 $7200^\circ$。虽然三角函数（$\sin, \cos$）能处理大角度，但过大的浮点数会导致**精度丢失**（浮点数越大，小数位精度越差）。
  因此，游戏引擎通常在每帧更新角度后执行：
  ```javascript
  angle = angle % 360; // 限制在 0 ~ 359 之间
  ```
- **屏幕边界穿梭（Wrap-around 效果）**：
  在一些复古游戏（如《吃豆人》或太空大战）中，玩家控制的飞船从屏幕右边界飞出，会立刻从屏幕左边界飞入。
  其坐标更新公式就是：
  ```javascript
  player.x = (player.x + step + screenWidth) % screenWidth;
  ```

#### 3. 基础数据结构与算法

- **哈希表/散列表（Hash Table）**：
  哈希函数会计算出一个非常大的整数（HashCode），但底层数组的长度是有限的（例如大小为 `16`）。
  为了决定这个元素存放在数组的哪个格子里，必须使用取余：
  ```javascript
  const index = hashCode % arrayLength;
  ```
- **环形缓冲区（Ring Buffer / Circular Queue）**：
  在音频播放、网络数据包接收中，为了避免频繁分配和拷贝内存，会使用固定大小的数组。读写指针在数组中循环移动，公式为：
  ```javascript
  writePointer = (writePointer + 1) % bufferSize;
  ```

#### 4. 时间与周期计算

- **时间制式转换**：
  - **时钟循环**：计算 13 点再过 12 个小时是几点：`(13 + 12) % 24 = 1` 点。
  - **星期计算**：今天是星期二（2），再过 100 天是星期几：`(2 + 100) % 7 = 4`（星期四）。
- **网格/矩阵行列计算**：
  在渲染棋盘或列表布局时，如果知道一个一维数组的索引 `i`，想知道它在 `N` 列布局中的行号和列号：
  - 列号（Column）= `i % N`
  - 行号（Row）= `Math.floor(i / N)`
