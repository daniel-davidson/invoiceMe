import 'dart:typed_data';
import 'package:crypto/crypto.dart';

/// Utility for computing file hashes for deduplication
/// Per FLOW_CONTRACT §6a: Duplicate Invoice Detection
class FileHashUtil {
  /// Compute SHA-256 hash of file bytes
  /// Returns hash in format: "sha256:abc123..."
  /// 
  /// Performance: < 200ms for 10MB file (per spec)
  static String computeSha256(Uint8List bytes) {
    final digest = sha256.convert(bytes);
    return 'sha256:${digest.toString()}';
  }

  /// Compute SHA-256 hash from hex string (lowercase)
  /// Used for backend comparison
  static String computeSha256Hex(Uint8List bytes) {
    final digest = sha256.convert(bytes);
    return digest.toString(); // Already lowercase hex
  }
}
