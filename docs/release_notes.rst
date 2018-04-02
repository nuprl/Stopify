=============
Release Notes
=============

Stopify (working version)
=========================

- Exposed the ``velocity`` estimator and set it as the default instead of
  ``reservoir``. In our experiments, ``velocity`` performs better and has
  negligible overhead.

- Added the ``.stackSize`` and ``.restoreFrames`` runtime options, which allow
  Stopify to simulate an arbitrarily deep stack.

- Fixed a bug where programs that used ``return`` or ``throw`` in the
  ``default:`` case of a ``switch`` statement would not resume correctly.

Stopify 0.1.0
=============

- Initial release
