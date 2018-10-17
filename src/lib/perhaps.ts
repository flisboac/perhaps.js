
type Monad<T> = Maybe<T> | Just<T> | None<T>;
type MonadValue<T> = T | undefined;
type MonadGetter<T> = () => (Monad<T> | MonadValue<T>);
type MonadMapper<T> = (value: MonadValue<T>) => MonadValue<T>;
type MonadFlatMapper<T> = (value: MonadValue<T>) => Just<T> | None<T>;
type MonadTransformer<T, R = T> = (value: T) => R
type MonadRawTransformer<T, R = T> = (value: MonadValue<T>) => MonadValue<R>

type MaybeVarargs<T> = (Monad<T> | MonadValue<T>)[];
type MaybeGetVarargs<T> = (Monad<T> | MonadGetter<T> | MonadValue<T>)[];

// Not working. :(
type JustValue<T> = Readonly<Just<T>>;
type NothingValue<T> = Readonly<None<T>>;

interface MonadParams<T = any> {

    isEmpty(T: MonadValue<T>): boolean;
    // The resolve function gives the user the chance to:
    // 1. Consider a Monad a domain value (i.e. store them in your class and/or 
    //    manipulate them without resolving and getting the final value)
    // 2. Break reference cycles (especially if (1) is a valid use case for the
    //    user)
    resolve: (maybe: Maybe<T>) => Just<T> | None<T>;
}

type MonadOptions<T> = Partial<MonadParams<T>>;

class MonadError extends Error {}
class EmptyMonadError extends MonadError {}
class LazyMonadError extends MonadError {}
class MonadResolutionError extends MonadError {}

class Maybe<T = any> {

    private getter?: MonadGetter<T> | Just<T> | None<T>;
    protected params_?: MonadParams<T>;

    static defaultParams: MonadParams<any> = {
        isEmpty: (value: any) => 
            value === undefined || value === null,
        resolve: (maybe: Monad<any>) => 
            maybe.resolved()
    }

    static nullableParams: MonadParams<any> = {
        isEmpty: (value: any) => 
            value === undefined,
        resolve: Maybe.defaultParams.resolve
    }

    protected constructor(params?: MonadParams<T>, getter?: MonadGetter<T>) {
        if (params) this.params_ = params;
        if (getter) this.getter = getter;
    }

    static completeParams<T = any>(reference: MonadParams<T>, params?: MonadOptions<T>): MonadParams | undefined {
        if (params) {
            if (!params.isEmpty) params.isEmpty = reference.isEmpty;
            if (!params.resolve) params.resolve = reference.resolve;
        }
        return params as MonadParams;
    }

    static none<T = any>(params?: MonadOptions<T>) {
        const resolvedParams = Maybe.completeParams(Maybe.defaultParams, params);
        return None.make<T>(resolvedParams);
    }

    static nullable<T = any>(params?: MonadParams<T | null>) {
        const resolvedParams = Maybe.completeParams(Maybe.nullableParams, params);
        return Maybe.none<T | null>(resolvedParams);
    }

    static lazy<T>(
        getter: () => T,
        params?: MonadParams<T>
    ) {
        const resolvedParams = Maybe.completeParams(Maybe.defaultParams, params);
        return new Maybe<T>(resolvedParams, getter);
    }

    static lazyNullable<T>(
        getter: () => T | null,
        params?: MonadParams<T | null>
    ) {
        const resolvedParams = Maybe.completeParams(Maybe.nullableParams, params);
        return Maybe.lazy<T | null>(getter, resolvedParams);
    }

    static of<T>(
        value: T | undefined,
        params?: MonadParams<T>
    ) {
        const resolvedParams = Maybe.completeParams(Maybe.defaultParams, params);
        return Maybe.none<T>(resolvedParams).or(value);
    }

    static ofNullable<T>(
        value?: T | null | undefined,
        params?: MonadParams<T | null>
    ) {
        const resolvedParams = Maybe.completeParams(Maybe.nullableParams, params);
        return Maybe.of<T | null>(value, resolvedParams).or(value);
    }

    params() {
        return (this.params_ || Maybe.defaultParams) as MonadParams<T>;
    }

    resolved(): Just<T> | None<T> {
        if (!this.getter) {
            throw new LazyMonadError();
        }

        if (!(this.getter instanceof Maybe)) {
            this.getter = this.none().or(this.getter());
        }
        
        return this.getter;
    }

    none() {
        return Maybe.none<T>(this.params_);
    }

    get<R = T>(transformer?: MonadTransformer<T, R>): T | R {
        return this.resolved().get(transformer);
    }

    raw<R = T>(transformer?: MonadRawTransformer<T, R>): MonadValue<T | R> {
        return this.resolved().raw(transformer);
    }

    expected(message?: () => any | string): Just<T> | None<T> {
        return this.resolved().expected(message);
    }

    isEmpty(): boolean {
        return this.resolved().isEmpty();
    }

    or(...fallbacks: MaybeVarargs<T>): Just<T> | None<T> {
        return this.resolved().or(...fallbacks);
    }

    orGet(...fallbacks: MaybeGetVarargs<T>): Just<T> | None<T> {
        return this.resolved().orGet(...fallbacks);
    }

    just(...fallbacks: MaybeVarargs<T>): Just<T> {
        return this.resolved().just(...fallbacks);
    }

    justGet(...fallbacks: MaybeGetVarargs<T>): Just<T> {
        return this.resolved().justGet(...fallbacks);
    }

    map(mapper: MonadMapper<T>): Just<T> | None<T> {
        return this.resolved().map(mapper);
    }

    flatMap(mapper: MonadFlatMapper<T>): Just<T> | None<T> {
        return this.resolved().flatMap(mapper);
    }

    visit<R>(visitor: {
        just?: (value: T) => R,
        none?: () => R
    }): Just<T> | None<T> {
        const monad = this.resolved();
        if (monad.isEmpty()) {
            if (visitor.none) visitor.none();
            else if (visitor.just) visitor.just(monad.get());
        }
        return monad;
    }

    ifPresent<R>(just: (value: T) => R): Just<T> | None<T> {
        return this.visit({ just });
    }

    ifAbsent<R>(none: () => R): Just<T> | None<T> {
        return this.visit({ none });
    }
};

class Just<T> extends Maybe<T> implements JustValue<T> {

    private value: T;

    private constructor(value: T, params?: MonadParams) {
        super(params);
        this.value = value;
    }

    static make<T>(value: T, params?: MonadParams) {
        return Object.freeze(new Just<T>(value, params)) as Just<T>;
    }

    resolved() {
        return this;
    }

    get<R = T>(transformer?: MonadTransformer<T, R>): T | R {
        if (transformer) return transformer(this.value);
        return this.value;
    }

    raw<R = T>(transformer?: MonadRawTransformer<T, R>): MonadValue<T | R> {
        if (transformer) return transformer(this.value);
        return this.value;
    }

    isEmpty() {
        return false;
    }

    expected(message?: () => any | string): Just<T> {
        message as unknown;
        return this;
    }

    or(...fallbacks: MaybeVarargs<T>) {
        fallbacks as unknown;
        return this;
    }

    orGet(...fallbacks: MaybeGetVarargs<T>) {
        fallbacks as unknown;
        return this;
    }

    just(...fallbacks: MaybeVarargs<T>) {
        fallbacks as unknown;
        return this;
    }

    justGet(...fallbacks: MaybeGetVarargs<T>) {
        fallbacks as unknown;
        return this;
    }

    map(mapper: MonadMapper<T>): Just<T> | None<T> {
        const mappedValue = mapper(this.value);
        return this.or(mappedValue);
    }

    flatMap(mapper: MonadFlatMapper<T>): Just<T> | None<T> {
        return mapper(this.value);
    }
};

class None<T> extends Maybe<T> implements NothingValue<T> {

    private constructor(params?: MonadParams) {
        super(params);
    }

    static make<T>(params?: MonadParams) {
        return Object.freeze(new None<T>(params)) as None<T>;
    }

    private doResolve(monad: Monad<T>): Just<T> | None<T> {
        monad = this.params().resolve(monad);

        if (monad instanceof None) {
            return this;
        }

        if (monad instanceof Just) {
            return monad;
        }

        throw new MonadResolutionError();
    }

    private doMaybe(
        evaluatingFunctions: boolean,
        ...fallbacks: MaybeGetVarargs<T>
    ) : Just<T> | None<T> {
        let maybe: Just<T> | None<T> = this;

        for (let fallback of fallbacks || []) {

            if (fallback instanceof Maybe) {
                maybe = this.doResolve(fallback);

            } else {
                // Oh, "any"... the audacity... the boldness...
                let value: any = undefined;

                if (typeof fallback === 'function' && evaluatingFunctions) {
                    value = (fallback as MonadGetter<T>)();

                } else {
                    value = fallback;
                }

                if (value instanceof Maybe) {
                    maybe = this.doResolve(value);

                } else if (!this.params().isEmpty(value) && value !== undefined) {
                    maybe = Just.make(value, this.params_);
                    break;
                }
            }
        }

        return maybe;
    }

    private doJust(
        evaluatingFunctions: boolean,
        ...fallbacks: MaybeGetVarargs<T>
    ) : Just<T> {
        const just = this.doMaybe(evaluatingFunctions, ...fallbacks);

        if (!(just instanceof Just)) {
            throw new EmptyMonadError();
        }

        return just;
    }

    resolved() {
        return this;
    }

    none() {
        return this;
    }

    get<R = T>(transformer?: MonadTransformer<T, R>): T | R {
        transformer as unknown;
        throw new EmptyMonadError();
    }

    raw<R = T>(transformer?: MonadRawTransformer<T, R>): MonadValue<T | R> {
        if (transformer) return transformer(undefined);
        return undefined;
    }

    isEmpty() {
        return true;
    }

    expected(message?: () => any | string): None<T> {
        if (typeof message === 'function') {
            throw message();
        }
        throw new EmptyMonadError(message);
    }

    or(...fallbacks: MaybeVarargs<T>): Just<T> | None<T> {
        return this.doMaybe(false, ...fallbacks);
    }

    orGet(...fallbacks: MaybeGetVarargs<T>): Just<T> | None<T> {
        return this.doMaybe(true, ...fallbacks);
    }

    just(...fallbacks: MaybeVarargs<T>): Just<T> {
        return this.doJust(false, ...fallbacks).just();
    }

    justGet(...fallbacks: MaybeGetVarargs<T>): Just<T> {
        return this.doJust(true, ...fallbacks).just();
    }

    map(mapper: MonadMapper<T>): None<T> {
        mapper as unknown;
        return this;
    }

    flatMap(mapper: MonadFlatMapper<T>): None<T> {
        mapper as unknown;
        return this;
    }
};

export {
    Monad,
    MonadOptions,
    MonadParams,
    MonadValue,
    MonadGetter,
    MonadMapper,
    MonadFlatMapper,

    Maybe,
    Just,
    None,

    MonadError,
    EmptyMonadError,
    LazyMonadError,
    MonadResolutionError
}

export default Maybe;
