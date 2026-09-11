/**
 * Cesium 类型补充声明。
 *
 * Cesium 在运行时通过入口导出了内置的 Knockout 副本（官方 Sandcastle 示例中常见的
 * `Cesium.knockout.track(viewModel)` 用法），但官方 `Cesium.d.ts` 并未声明它，
 * 因此在这里补上这部分类型。
 *
 * 注意：文件顶部的 `export {}` 是**必需**的，它让本文件成为一个「模块」，
 * 从而使下面的 `declare module "cesium"` 成为**模块增强（augmentation）**——
 * 只在 cesium 官方类型的基础上追加成员。
 *
 * 如果去掉 `export {}`，本文件会变成全局脚本，`declare module "cesium"` 就成了
 * 「环境模块声明（ambient module declaration）」：一旦 `node_modules/cesium` 的类型
 * 解析失败（例如依赖未安装、或 npm install 正在改写 node_modules），
 * 这份声明会成为 cesium 模块的**唯一**定义，于是所有 Cesium 成员都会报
 * TS2694「命名空间 "cesium" 没有已导出的成员 X」，
 * 而不是更直白的 TS2307「找不到模块 cesium」，非常容易误导排查方向。
 */
export {};

declare module "cesium" {
  /**
   * Knockout 订阅句柄，由 `KnockoutObservable.subscribe()` 返回。
   */
  type KnockoutSubscription = {
    /** 取消该订阅，避免组件卸载后回调继续触发导致内存泄漏。 */
    dispose(): void;
  };

  /**
   * Knockout 可观察对象（observable）。
   *
   * @typeParam T - 被观察属性的值类型。
   */
  type KnockoutObservable<T> = {
    /**
     * 订阅属性变化。
     *
     * @param callback - 属性变化时触发的回调，参数为变化后的新值。
     * @returns 订阅句柄，调用其 `dispose()` 可取消订阅。
     */
    subscribe(callback: (newValue: T) => void): KnockoutSubscription;
  };

  /**
   * Cesium 内置 Knockout 库对外暴露的 API 子集（仅声明本项目用到的部分）。
   */
  type KnockoutLike = {
    /**
     * 将视图模型对象的各个属性转换为可观察属性，使其支持数据绑定。
     *
     * @typeParam T - 视图模型的类型。
     * @param viewModel - 需要被追踪的视图模型对象（会被就地修改）。
     */
    track<T extends object>(viewModel: T): void;

    /**
     * 将视图模型与 DOM 节点上的 `data-bind` 声明建立双向绑定。
     *
     * @param viewModel - 已经过 `track()` 处理的视图模型对象。
     * @param rootNode - 应用绑定的根 DOM 节点；省略或为 null 时作用于整个文档。
     */
    applyBindings(viewModel: object, rootNode?: Node | null): void;

    /**
     * 获取视图模型上某个属性对应的可观察对象（用于手动订阅其变化）。
     *
     * @typeParam T - 视图模型的类型。
     * @typeParam K - 属性名，需为 T 的键。
     * @param viewModel - 已经过 `track()` 处理的视图模型对象。
     * @param propertyName - 属性名。
     * @returns 该属性的可观察对象，值类型与属性类型一致。
     */
    getObservable<T extends object, K extends keyof T>(
      viewModel: T,
      propertyName: K,
    ): KnockoutObservable<T[K]>;

    /**
     * `getObservable` 的宽松重载：属性名以任意字符串传入时使用。
     *
     * @typeParam T - 视图模型的类型。
     * @param viewModel - 已经过 `track()` 处理的视图模型对象。
     * @param propertyName - 属性名（任意字符串，不做键名校验）。
     * @returns 该属性的可观察对象，值类型为 unknown，使用时需自行断言。
     */
    getObservable<T extends object>(
      viewModel: T,
      propertyName: string,
    ): KnockoutObservable<unknown>;
  };

  /** Cesium 内置的 Knockout 实例（推荐使用的入口）。 */
  export const knockout: KnockoutLike;

  /** Cesium 内置的 Knockout 3.5.1 版本实例（带版本号的具名导出）。 */
  export const knockout_3_5_1: KnockoutLike;

  /** Cesium 内置的 knockout-es5 插件实例，提供 `track`/`getObservable` 能力。 */
  export const knockout_es5: KnockoutLike;
}
