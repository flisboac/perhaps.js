// tslint:disable:no-expression-statement
import test from 'ava';
import Maybe, { Just } from './perhaps'


test('Default Nothing', t => {
    const none = Maybe.none();
    const otherNothing = Maybe.none();
    const payload = true;
    const just = Maybe.of(payload);
    const getter = () => payload;
    const justGetter = () => just;
    const otherNothingGetter = () => otherNothing;
    
    t.is(none.params(), Maybe.defaultParams);
    t.is(none.resolved(), none);
    t.throws(() => none.get());
    t.is(none.raw(), undefined);
    t.truthy(none.isEmpty());

    t.is(none.or(), none);
    t.is(none.or(none), none);
    t.is(none.or(otherNothing), none);
    t.is(none.or(just), just);
    t.truthy(none.or(payload) instanceof Just);
    t.truthy(none.or(getter) instanceof Just);
    t.is(none.or(justGetter).get(), justGetter);
    t.is(none.or(payload).get(), payload);
    t.is(none.or(getter).get(), getter);
    t.truthy(none.or(otherNothingGetter) instanceof Just);
    
    t.is(none.orGet(), none);
    t.is(none.orGet(none), none);
    t.is(none.orGet(otherNothing), none);
    t.is(none.orGet(just), just);
    t.truthy(none.orGet(payload) instanceof Just);
    t.truthy(none.orGet(getter) instanceof Just);
    t.truthy(none.orGet(justGetter) instanceof Just);
    t.is(none.orGet(payload).get(), payload);
    t.is(none.orGet(getter).get(), payload);
    t.is(none.orGet(justGetter).get(), payload);
    t.is(none.orGet(otherNothingGetter), none);

    t.throws(() => none.just());
    t.throws(() => none.just(none));
    t.throws(() => none.just(otherNothing));
    t.is(none.just(just), just as any);
    t.truthy(none.just(payload) instanceof Just);
    t.truthy(none.just(getter) instanceof Just);
    t.is(none.just(justGetter).get(), justGetter);
    t.is(none.just(payload).get(), payload);
    t.is(none.just(getter).get(), getter);
    t.truthy(none.just(otherNothingGetter) instanceof Just);
    
    t.throws(() => none.justGet());
    t.throws(() => none.justGet(none));
    t.throws(() => none.justGet(otherNothing));
    t.is(none.justGet(just), just as any);
    t.truthy(none.justGet(payload) instanceof Just);
    t.truthy(none.justGet(getter) instanceof Just);
    t.truthy(none.justGet(justGetter) instanceof Just);
    t.is(none.justGet(payload).get(), payload);
    t.is(none.justGet(getter).get(), payload);
    t.is(none.justGet(justGetter).get(), payload);
    t.throws(() => none.justGet(otherNothingGetter));

});

// test('power', t => {
//   t.is(power(2, 4), 16);
// });
