/**
 * @typedef {import('vfile-message').VFileMessage} VFileMessage
 */

import path from 'node:path'
import test from 'tape'
import strip from 'strip-ansi'
import {VFile} from 'vfile'
import figures from 'figures'
import reporterDefault, {reporter} from './index.js'

/* eslint-disable no-undef */
/** @type {Error} */
let exception
/** @type {Error} */
let changedMessage
/** @type {Error} */
let multilineException

try {
  // @ts-expect-error
  variable = 1
} catch (error) {
  const error_ = /** @type {Error} */ (error)
  error_.stack = cleanStack(error_.stack, 3)
  exception = error_
}

try {
  // @ts-expect-error
  variable = 1
} catch (error) {
  const error_ = /** @type {Error} */ (error)
  error_.message = 'foo'
  error_.stack = cleanStack(error_.stack, 3)
  changedMessage = error_
}

try {
  // @ts-expect-error
  variable = 1
} catch (error) {
  const error_ = /** @type {Error} */ (error)
  error_.message = 'foo\nbar\nbaz'
  error_.stack = cleanStack(error_.stack, 5)
  multilineException = error_
}
/* eslint-enable no-undef */

test('vfile-reporter', (t) => {
  t.equal(
    reporter,
    reporterDefault,
    'should expose `reporter` as a named and a default export'
  )

  /** @type {VFile} */
  let file

  t.equal(reporter(), '', 'should return empty without a file')

  t.equal(reporter([]), '', 'should return empty when not given files')

  t.equal(reporter(exception), exception.stack, 'should support an error')

  file = new VFile({path: 'a.js'})

  try {
    file.fail('Error!')
  } catch {}

  t.equal(
    reporter(file.messages[0]),
    'a.js:1:1: Error!',
    'should support a fatal message'
  )

  t.equal(
    strip(reporter(new VFile({path: 'a.js'}))),
    'a.js: no issues found',
    'should work on a single file'
  )

  t.equal(
    strip(reporter(new VFile())),
    'no issues found',
    'should work without file-paths'
  )

  t.equal(
    strip(reporter([new VFile({path: 'a.js'}), new VFile({path: 'b.js'})])),
    'a.js: no issues found\nb.js: no issues found',
    'should work on files without messages'
  )

  file = new VFile({path: 'a.js'})
  file.message('Warning!')

  t.equal(
    strip(reporter([file, new VFile({path: 'b.js'})])),
    [
      'a.js',
      '  1:1  warning  Warning!',
      '',
      'b.js: no issues found',
      '',
      figures.warning + ' 1 warning'
    ].join('\n'),
    'should work on files with warnings'
  )

  file = new VFile({path: 'a.js'})

  try {
    file.fail('Error!')
  } catch {}

  t.equal(
    strip(reporter([file, new VFile({path: 'b.js'})])),
    [
      'a.js',
      '  1:1  error  Error!',
      '',
      'b.js: no issues found',
      '',
      figures.cross + ' 1 error'
    ].join('\n'),
    'should work on files with errors'
  )

  file = new VFile({path: 'a.js'})

  try {
    file.fail('Error!')
  } catch {}

  file.message('Note!')
  file.message('Warning!')
  file.message('Another warning!')
  file.info('Another note!')

  try {
    file.fail('Another error!')
  } catch {}

  t.equal(
    strip(reporter(file)),
    [
      'a.js',
      '  1:1  error    Another error!',
      '  1:1  error    Error!',
      '  1:1  warning  Another warning!',
      '  1:1  warning  Note!',
      '  1:1  warning  Warning!',
      '  1:1  info     Another note!',
      '',
      '6 messages (' +
        figures.cross +
        ' 2 errors, ' +
        figures.warning +
        ' 3 warnings)'
    ].join('\n'),
    'should work on files with multiple mixed messages'
  )

  t.equal(
    reporter(file, {color: false}),
    [
      'a.js',
      '  1:1  error    Another error!',
      '  1:1  error    Error!',
      '  1:1  warning  Another warning!',
      '  1:1  warning  Note!',
      '  1:1  warning  Warning!',
      '  1:1  info     Another note!',
      '',
      '6 messages (' +
        figures.cross +
        ' 2 errors, ' +
        figures.warning +
        ' 3 warnings)'
    ].join('\n'),
    'should work on files with multiple mixed messages (w/o color)'
  )

  file = new VFile()
  Object.assign(file.message('Warning!'), {position: null})

  t.equal(
    strip(reporter(file)),
    '    warning  Warning!\n\n' + figures.warning + ' 1 warning',
    'should support a missing position'
  )

  file = new VFile()
  file.message('Warning!', {line: 3, column: 2})

  t.equal(
    strip(reporter(file)),
    ['  3:2  warning  Warning!', '', figures.warning + ' 1 warning'].join('\n'),
    'should support a single point'
  )

  file = new VFile()
  file.message('Warning!', {
    start: {line: 3, column: 2},
    end: {line: 4, column: 8}
  })

  t.equal(
    strip(reporter(file)),
    ['  3:2-4:8  warning  Warning!', '', figures.warning + ' 1 warning'].join(
      '\n'
    ),
    'should support a location'
  )

  file = new VFile()
  file.message('Warning!', {
    start: {line: 3, column: 2},
    end: {line: 4, column: 8}
  })
  file.basename = 'foo.bar'

  t.equal(
    strip(reporter(file)),
    [
      'foo.bar',
      '  3:2-4:8  warning  Warning!',
      '',
      figures.warning + ' 1 warning'
    ].join('\n'),
    'should support a location (#2)'
  )

  file = new VFile({path: 'test.js'})

  try {
    file.fail(exception)
  } catch {}

  t.equal(
    cleanStack(strip(reporter(file)), 3),
    [
      'test.js',
      '  1:1  error  ReferenceError: variable is not defined',
      '    at test.js:1:1'
    ].join('\n'),
    'should support a “real” error (show a stack)'
  )

  file = new VFile({path: 'test.js'})

  try {
    file.fail(exception, undefined, 'foo:bar')
  } catch {}

  t.equal(
    cleanStack(strip(reporter(file)), 3),
    [
      'test.js',
      '  1:1  error  ReferenceError: variable is not defined  bar  foo',
      '    at test.js:1:1'
    ].join('\n'),
    'should properly align a real error with a source'
  )

  file = new VFile({path: 'test.js'})

  try {
    file.fail(changedMessage)
  } catch {}

  t.equal(
    cleanStack(strip(reporter(file)), 3),
    'test.js\n  1:1  error  ReferenceError: foo\n    at test.js:1:1',
    'should support a “real” error with a changed message'
  )

  file = new VFile({path: 'test.js'})

  try {
    file.fail(multilineException)
  } catch {}

  t.equal(
    cleanStack(strip(reporter(file)), 5),
    [
      'test.js',
      '  1:1  error  ReferenceError: foo',
      'bar',
      'baz',
      '    at test.js:1:1'
    ].join('\n'),
    'should support a “real” error with a multiline message'
  )

  file = new VFile({path: 'test.js'})

  try {
    file.fail(multilineException, undefined, 'alpha:bravo')
  } catch {}

  t.equal(
    cleanStack(strip(reporter(file)), 5),
    [
      'test.js',
      '  1:1  error  ReferenceError: foo  bravo  alpha',
      'bar',
      'baz',
      '    at test.js:1:1'
    ].join('\n'),
    'should support a “real” error with a multiline message and a source'
  )

  file = new VFile({path: 'a.js'})
  const warning = file.message('Whoops')
  warning.note = 'Lorem ipsum dolor sit amet.'
  file.message('...and some more warnings')

  t.equal(
    strip(reporter(file, {verbose: true})),
    [
      'a.js',
      '  1:1  warning  ...and some more warnings',
      '  1:1  warning  Whoops',
      'Lorem ipsum dolor sit amet.',
      '',
      figures.warning + ' 2 warnings'
    ].join('\n'),
    'should support `note` in verbose mode'
  )

  file = new VFile({path: 'a.js'})
  file.message('Warning!')

  t.equal(
    strip(reporter([file, new VFile({path: 'b.js'})], {quiet: true})),
    [
      'a.js',
      '  1:1  warning  Warning!',
      '',
      figures.warning + ' 1 warning'
    ].join('\n'),
    'should ignore successful files in `quiet` mode'
  )

  file = new VFile({path: 'a.js'})
  const fileB = new VFile({path: 'b.js'})

  try {
    file.fail('Error!')
  } catch {}

  fileB.message('Warning!')

  t.equal(
    strip(reporter([file, fileB], {silent: true})),
    ['a.js', '  1:1  error  Error!', '', figures.cross + ' 1 error'].join('\n'),
    'should ignore non-failures in `silent` mode'
  )

  file = new VFile({path: 'a.js'})
  file.stem = 'b'

  t.equal(
    strip(reporter(file)),
    'a.js: no issues found',
    'should support `history`'
  )

  file = new VFile({path: 'a.js'})
  file.stored = true

  t.equal(strip(reporter(file)), 'a.js: written', 'should support `stored`')

  t.equal(
    reporter(file, {color: false}),
    'a.js: written',
    'should support `stored` (w/o color)'
  )

  file = new VFile({path: 'a.js'})
  file.stem = 'b'
  file.stored = true

  t.equal(
    strip(reporter(file)),
    'a.js > b.js: written',
    'should expose the stored file-path'
  )

  t.equal(
    reporter(new VFile({path: 'a.js'}), {color: true}),
    '\u001B[4m\u001B[32ma.js\u001B[39m\u001B[24m: no issues found',
    'should support `color: true`'
  )

  t.equal(
    reporter(new VFile({path: 'a.js'}), {color: false}),
    'a.js: no issues found',
    'should support `color: false`'
  )

  t.end()
})

/**
 * @param {string|undefined} stack
 * @param {number} max
 */
function cleanStack(stack, max) {
  return (stack || '')
    .replace(new RegExp('\\(.+\\' + path.sep, 'g'), '(')
    .replace(/file:.+\//g, '')
    .replace(/\d+:\d+/g, '1:1')
    .split('\n')
    .slice(0, max)
    .join('\n')
}
