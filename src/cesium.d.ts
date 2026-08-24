declare module "cesium" {
  type KnockoutSubscription = {
    dispose(): void;
  };

  type KnockoutObservable<T> = {
    subscribe(callback: (newValue: T) => void): KnockoutSubscription;
  };

  type KnockoutLike = {
    track<T extends object>(viewModel: T): void;
    applyBindings(viewModel: object, rootNode?: Node | null): void;
    getObservable<T extends object, K extends keyof T>(
      viewModel: T,
      propertyName: K,
    ): KnockoutObservable<T[K]>;
    getObservable<T extends object>(
      viewModel: T,
      propertyName: string,
    ): KnockoutObservable<unknown>;
  };

  export const knockout: KnockoutLike;
  export const knockout_3_5_1: KnockoutLike;
  export const knockout_es5: KnockoutLike;
}
