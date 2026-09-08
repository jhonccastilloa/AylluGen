jest.mock(
  '@nozbe/watermelondb/adapters/sqlite',
  () =>
    class {
      _setUpWithMigrations = jest.fn();
    },
);
import { PreservingSQLiteAdapter } from './PreservingSQLiteAdapter';

it('refuses unknown historical schemas without invoking schema reset', () => {
  const adapter = Object.create(
    PreservingSQLiteAdapter.prototype,
  ) as PreservingSQLiteAdapter;
  adapter._migrationSteps = jest.fn().mockReturnValue(undefined);
  adapter._setUpWithSchema = jest.fn();
  const callback = jest.fn();
  adapter._setUpWithMigrations(1, callback);
  expect(callback).toHaveBeenCalledWith({ error: expect.any(Error) });
  expect(adapter._setUpWithSchema).not.toHaveBeenCalled();
});
