import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

/// Singleton SQLite key-value cache.
///
/// Each entry stores the full JSON API response keyed by a string
/// (usually the endpoint or a derived slug). This avoids typed table
/// schemas and means zero migrations when API responses evolve.
class CacheService {
  CacheService._();
  static final CacheService instance = CacheService._();

  Database? _db;

  // ── Lifecycle ─────────────────────────────────────────────────────────
  Future<void> init() async {
    if (_db != null) return;
    final dbPath = join(await getDatabasesPath(), 'app_cache.db');
    _db = await openDatabase(
      dbPath,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE IF NOT EXISTS cache_store (
            cache_key  TEXT PRIMARY KEY,
            json_value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )
        ''');
      },
    );
  }

  Database get _database {
    final db = _db;
    if (db == null) throw StateError('CacheService.init() was not called.');
    return db;
  }

  // ── Read ──────────────────────────────────────────────────────────────
  /// Returns the decoded JSON for [key], or null if not cached yet.
  Future<dynamic> read(String key) async {
    final rows = await _database.query(
      'cache_store',
      columns: ['json_value'],
      where: 'cache_key = ?',
      whereArgs: [key],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    try {
      return json.decode(rows.first['json_value'] as String);
    } catch (_) {
      return null;
    }
  }

  // ── Write ─────────────────────────────────────────────────────────────
  /// Encodes [data] as JSON and upserts it under [key].
  Future<void> write(String key, dynamic data) async {
    final encoded = json.encode(data);
    await _database.insert('cache_store', {
      'cache_key': key,
      'json_value': encoded,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  // ── Clear ─────────────────────────────────────────────────────────────
  /// Wipes all cached rows. Call this on user logout.
  Future<void> clearAll() async {
    await _database.delete('cache_store');
  }
}
