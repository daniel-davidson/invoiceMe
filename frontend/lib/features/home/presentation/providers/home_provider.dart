import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/core/utils/file_hash.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';

/// Upload stages for progress indication
enum UploadStage { idle, uploading, ocr, extracting, saving, complete, error }

class LatestInvoice {
  final String id;
  final String? name;
  final double originalAmount;
  final String originalCurrency;
  final DateTime invoiceDate;
  final bool needsReview;

  LatestInvoice({
    required this.id,
    this.name,
    required this.originalAmount,
    required this.originalCurrency,
    required this.invoiceDate,
    required this.needsReview,
  });

  factory LatestInvoice.fromJson(Map<String, dynamic> json) {
    return LatestInvoice(
      id: json['id'] as String,
      name: json['name'] as String?,
      originalAmount: _parseDouble(json['originalAmount']),
      originalCurrency: json['originalCurrency'] as String,
      invoiceDate: DateTime.parse(json['invoiceDate'] as String),
      needsReview: json['needsReview'] as bool? ?? false,
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }
}

class Vendor {
  final String id;
  final String name;
  final int? invoiceCount;
  final double? monthlyLimit;
  final List<LatestInvoice>? latestInvoices;

  Vendor({
    required this.id,
    required this.name,
    this.invoiceCount,
    this.monthlyLimit,
    this.latestInvoices,
  });

  factory Vendor.fromJson(Map<String, dynamic> json) {
    return Vendor(
      id: json['id'] as String,
      name: json['name'] as String,
      invoiceCount: json['invoiceCount'] as int?,
      monthlyLimit: json['monthlyLimit'] != null
          ? _parseDouble(json['monthlyLimit'])
          : null,
      latestInvoices: json['latestInvoices'] != null
          ? (json['latestInvoices'] as List)
                .map((e) => LatestInvoice.fromJson(e as Map<String, dynamic>))
                .toList()
          : null,
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }
}

/// Upload result data (for post-upload assignment modal + duplicate detection)
class UploadResult {
  final String invoiceId;
  final String? extractedVendorId;
  final String extractedVendorName;
  final double confidence;
  final bool needsReview;

  // Additional fields for duplicate detection dialog
  final double? amount;
  final String? currency;
  final DateTime? invoiceDate;
  final DateTime? uploadedAt;
  final String? invoiceNumber;

  const UploadResult({
    required this.invoiceId,
    this.extractedVendorId,
    required this.extractedVendorName,
    required this.confidence,
    required this.needsReview,
    this.amount,
    this.currency,
    this.invoiceDate,
    this.uploadedAt,
    this.invoiceNumber,
  });
}

/// Upload state to track progress, errors, and success
class UploadState {
  final bool isUploading;
  final String? error;
  final String? successMessage;
  final double? progress;
  final UploadStage uploadStage;
  final UploadResult?
  uploadResult; // NEW: For triggering post-upload assignment modal

  const UploadState({
    this.isUploading = false,
    this.error,
    this.successMessage,
    this.progress,
    this.uploadStage = UploadStage.idle,
    this.uploadResult,
  });
}

final uploadStateProvider = StateProvider<UploadState>(
  (ref) => const UploadState(),
);

final vendorsProvider =
    StateNotifierProvider<VendorsNotifier, AsyncValue<List<Vendor>>>((ref) {
      final apiClient = ref.watch(apiClientProvider);
      return VendorsNotifier(apiClient, ref);
    });

class VendorsNotifier extends StateNotifier<AsyncValue<List<Vendor>>> {
  final ApiClient _apiClient;
  final Ref _ref;
  final ImagePicker _imagePicker = ImagePicker();

  VendorsNotifier(this._apiClient, this._ref)
    : super(const AsyncValue.loading()) {
    loadVendors();
  }

  Future<void> loadVendors() async {
    state = const AsyncValue.loading();
    try {
      final response = await _apiClient.get(
        '/vendors?includeInvoiceCount=true&includeLatestInvoices=true',
      );
      final List<dynamic> data = response.data as List<dynamic>;
      final vendors = data
          .map((json) => Vendor.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(vendors);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> addVendor(String name, {double? monthlyLimit}) async {
    try {
      await _apiClient.post(
        '/vendors',
        data: {'name': name, 'monthlyLimit': monthlyLimit ?? 0},
      );
      await loadVendors();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateVendor(String id, String name) async {
    try {
      await _apiClient.patch('/vendors/$id', data: {'name': name});
      await loadVendors();
    } catch (e) {
      // Handle error
    }
  }

  Future<void> deleteVendor(String id) async {
    try {
      await _apiClient.delete('/vendors/$id');
      await loadVendors();
    } catch (e) {
      // Handle error
    }
  }

  // Camera upload removed per FLOW_CONTRACT v2.0 - gallery and PDF only

  Future<void> uploadFromGallery() async {
    try {
      _setUploading(true);

      if (kIsWeb) {
        // On web, use file_picker for images too (more reliable)
        final result = await FilePicker.platform.pickFiles(
          type: FileType.image,
          withData: true, // Get bytes on web
        );
        if (result != null && result.files.single.bytes != null) {
          await _uploadFileFromBytes(
            result.files.single.bytes!,
            result.files.single.name,
          );
        }
      } else {
        final XFile? image = await _imagePicker.pickImage(
          source: ImageSource.gallery,
        );
        if (image != null) {
          await _uploadFileFromPath(image.path, image.name);
        }
      }
    } catch (e) {
      _setError('Failed to pick image: $e');
    } finally {
      _setUploading(false);
    }
  }

  Future<void> uploadPdf() async {
    try {
      _setUploading(true);
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        withData: kIsWeb, // Get bytes on web
      );

      if (result != null) {
        final file = result.files.single;
        if (kIsWeb) {
          // On web, use bytes
          if (file.bytes != null) {
            await _uploadFileFromBytes(file.bytes!, file.name);
          } else {
            _setError('Failed to read file data');
          }
        } else {
          // On mobile/desktop, use path
          if (file.path != null) {
            await _uploadFileFromPath(file.path!, file.name);
          } else {
            _setError('Failed to get file path');
          }
        }
      }
    } catch (e) {
      _setError('Failed to pick file: $e');
    } finally {
      _setUploading(false);
    }
  }

  Future<void> _uploadFileFromPath(String path, String name) async {
    final uploadStartTime = DateTime.now();
    try {
      print(
        '[HomeProvider] Upload started at ${uploadStartTime.toIso8601String()}',
      );

      // Stage 1: Uploading file
      _ref.read(uploadStateProvider.notifier).state = const UploadState(
        isUploading: true,
        uploadStage: UploadStage.uploading,
      );

      final requestSentTime = DateTime.now();
      // IMPORTANT: Do NOT pass vendorId - let backend extract and match vendor automatically
      final response = await _apiClient.uploadFile(
        '/invoices/upload',
        path,
        name,
        data: {}, // Explicitly empty data - no vendorId override
        onSendProgress: (sent, total) {
          _ref.read(uploadStateProvider.notifier).state = UploadState(
            isUploading: true,
            progress: sent / total,
            uploadStage: UploadStage.uploading,
          );
        },
      );

      // Simulate stage transitions for visibility (backend processes happen on server)
      // Stage 2: OCR
      _ref.read(uploadStateProvider.notifier).state = const UploadState(
        isUploading: true,
        uploadStage: UploadStage.ocr,
      );
      await Future.delayed(const Duration(milliseconds: 300));

      // Stage 3: Extracting
      _ref.read(uploadStateProvider.notifier).state = const UploadState(
        isUploading: true,
        uploadStage: UploadStage.extracting,
      );
      await Future.delayed(const Duration(milliseconds: 300));

      // Stage 4: Saving
      _ref.read(uploadStateProvider.notifier).state = const UploadState(
        isUploading: true,
        uploadStage: UploadStage.saving,
      );
      await Future.delayed(const Duration(milliseconds: 200));

      final responseReceivedTime = DateTime.now();
      final requestDuration = responseReceivedTime
          .difference(requestSentTime)
          .inMilliseconds;
      print('[HomeProvider] Request completed in ${requestDuration}ms');

      // Extract upload result from response with null safety
      final invoiceData = response.data['invoice'];
      if (invoiceData == null || invoiceData['id'] == null) {
        throw Exception('Invalid response: missing invoice data');
      }

      final invoiceId = invoiceData['id'] as String;

      // Handle both scenarios:
      // 1. Vendor matched: response has 'vendor' object
      // 2. Vendor needs manual assignment: response has 'extractedVendorNameCandidate'
      final vendorData = response.data['vendor'];
      final String? vendorId = vendorData?['id'] ?? invoiceData['vendorId'];
      final String vendorName =
          vendorData?['name'] ??
          response.data['extractedVendorNameCandidate'] ??
          'Unknown vendor';
      final confidence = (vendorData?['confidence'] as num?)?.toDouble() ?? 0.0;
      final needsReview = invoiceData['needsReview'] ?? false;

      // Reload vendors to get updated invoice counts
      await loadVendors();

      // Stage 5: Complete with upload result (triggers post-upload assignment modal)
      _ref.read(uploadStateProvider.notifier).state = UploadState(
        isUploading: false,
        uploadStage: UploadStage.complete,
        uploadResult: UploadResult(
          invoiceId: invoiceId,
          extractedVendorId: vendorId,
          extractedVendorName: vendorName,
          confidence: confidence,
          needsReview: needsReview,
        ),
      );

      final renderCompleteTime = DateTime.now();
      final totalDuration = renderCompleteTime
          .difference(uploadStartTime)
          .inMilliseconds;
      print(
        '[HomeProvider] Upload took ${totalDuration}ms total (request: ${requestDuration}ms, reload: ${renderCompleteTime.difference(responseReceivedTime).inMilliseconds}ms)',
      );
    } catch (e) {
      final errorTime = DateTime.now();
      final totalDuration = errorTime
          .difference(uploadStartTime)
          .inMilliseconds;
      print('[HomeProvider] Upload failed after ${totalDuration}ms: $e');

      _ref.read(uploadStateProvider.notifier).state = UploadState(
        isUploading: false,
        uploadStage: UploadStage.error,
        error: 'Upload failed: $e',
      );
    }
  }

  Future<void> _uploadFileFromBytes(Uint8List bytes, String name) async {
    final uploadStartTime = DateTime.now();
    try {
      print(
        '[HomeProvider] Upload started at ${uploadStartTime.toIso8601String()}',
      );

      // Stage 0.5: Check for duplicate (compute hash + API check)
      print('[HomeProvider] Computing file hash for duplicate detection...');
      final fileHash = FileHashUtil.computeSha256(bytes);
      print('[HomeProvider] File hash computed: $fileHash');

      // Check for duplicate via API
      final duplicateCheck = await _checkDuplicate(fileHash);
      if (duplicateCheck != null) {
        // Duplicate detected - set error state with duplicate info
        _ref.read(uploadStateProvider.notifier).state = UploadState(
          isUploading: false,
          uploadStage: UploadStage.error,
          error: 'DUPLICATE_INVOICE',
          uploadResult: duplicateCheck,
        );
        return;
      }

      // Stage 1: Uploading file
      _ref.read(uploadStateProvider.notifier).state = const UploadState(
        isUploading: true,
        uploadStage: UploadStage.uploading,
      );

      final requestSentTime = DateTime.now();
      // IMPORTANT: Do NOT pass vendorId - let backend extract and match vendor automatically
      final response = await _apiClient.uploadFileBytes(
        '/invoices/upload',
        bytes,
        name,
        data: {}, // Explicitly empty data - no vendorId override
        onSendProgress: (sent, total) {
          _ref.read(uploadStateProvider.notifier).state = UploadState(
            isUploading: true,
            progress: sent / total,
            uploadStage: UploadStage.uploading,
          );
        },
      );

      // Simulate stage transitions for visibility (backend processes happen on server)
      // Stage 2: OCR
      _ref.read(uploadStateProvider.notifier).state = const UploadState(
        isUploading: true,
        uploadStage: UploadStage.ocr,
      );
      await Future.delayed(const Duration(milliseconds: 300));

      // Stage 3: Extracting
      _ref.read(uploadStateProvider.notifier).state = const UploadState(
        isUploading: true,
        uploadStage: UploadStage.extracting,
      );
      await Future.delayed(const Duration(milliseconds: 300));

      // Stage 4: Saving
      _ref.read(uploadStateProvider.notifier).state = const UploadState(
        isUploading: true,
        uploadStage: UploadStage.saving,
      );
      await Future.delayed(const Duration(milliseconds: 200));

      final responseReceivedTime = DateTime.now();
      final requestDuration = responseReceivedTime
          .difference(requestSentTime)
          .inMilliseconds;
      print('[HomeProvider] Request completed in ${requestDuration}ms');

      // Extract upload result from response with null safety
      final invoiceData = response.data['invoice'];
      if (invoiceData == null || invoiceData['id'] == null) {
        throw Exception('Invalid response: missing invoice data');
      }

      final invoiceId = invoiceData['id'] as String;

      // Handle both scenarios:
      // 1. Vendor matched: response has 'vendor' object
      // 2. Vendor needs manual assignment: response has 'extractedVendorNameCandidate'
      final vendorData = response.data['vendor'];
      final String? vendorId = vendorData?['id'] ?? invoiceData['vendorId'];
      final String vendorName =
          vendorData?['name'] ??
          response.data['extractedVendorNameCandidate'] ??
          'Unknown vendor';
      final confidence = (vendorData?['confidence'] as num?)?.toDouble() ?? 0.0;
      final needsReview = invoiceData['needsReview'] ?? false;

      // Reload vendors to get updated invoice counts
      await loadVendors();

      // Stage 5: Complete with upload result (triggers post-upload assignment modal)
      _ref.read(uploadStateProvider.notifier).state = UploadState(
        isUploading: false,
        uploadStage: UploadStage.complete,
        uploadResult: UploadResult(
          invoiceId: invoiceId,
          extractedVendorId: vendorId,
          extractedVendorName: vendorName,
          confidence: confidence,
          needsReview: needsReview,
        ),
      );

      final renderCompleteTime = DateTime.now();
      final totalDuration = renderCompleteTime
          .difference(uploadStartTime)
          .inMilliseconds;
      print(
        '[HomeProvider] Upload took ${totalDuration}ms total (request: ${requestDuration}ms, reload: ${renderCompleteTime.difference(responseReceivedTime).inMilliseconds}ms)',
      );
    } catch (e) {
      final errorTime = DateTime.now();
      final totalDuration = errorTime
          .difference(uploadStartTime)
          .inMilliseconds;
      print('[HomeProvider] Upload failed after ${totalDuration}ms: $e');

      _ref.read(uploadStateProvider.notifier).state = UploadState(
        isUploading: false,
        uploadStage: UploadStage.error,
        error: 'Upload failed: $e',
      );
    }
  }

  void _setUploading(bool uploading) {
    _ref.read(uploadStateProvider.notifier).state = UploadState(
      isUploading: uploading,
      uploadStage: uploading ? UploadStage.uploading : UploadStage.idle,
    );
  }

  void _setError(String error) {
    _ref.read(uploadStateProvider.notifier).state = UploadState(
      error: error,
      uploadStage: UploadStage.error,
    );
  }

  /// Check for duplicate invoice via backend API
  /// Returns UploadResult with existing invoice data if duplicate found, null otherwise
  /// Per FLOW_CONTRACT §6a: Duplicate detection is "fail-open" - proceed on error
  Future<UploadResult?> _checkDuplicate(String fileHash) async {
    try {
      final response = await _apiClient.post(
        '/invoices/check-duplicate',
        data: {'fileHash': fileHash},
      );

      // If we get here, duplicate was found (200 OK)
      final existing = response.data['existingInvoice'];
      if (existing != null) {
        return UploadResult(
          invoiceId: existing['id'] as String,
          extractedVendorId: existing['vendorId'] as String? ?? '',
          extractedVendorName:
              existing['vendor']?['name'] as String? ?? 'Unknown',
          confidence: 1.0, // Duplicate is 100% confident
          needsReview: false,
          // Additional fields for duplicate dialog
          amount: (existing['originalAmount'] as num?)?.toDouble(),
          currency: existing['originalCurrency'] as String?,
          invoiceDate: existing['invoiceDate'] != null
              ? DateTime.parse(existing['invoiceDate'] as String)
              : null,
          uploadedAt: existing['createdAt'] != null
              ? DateTime.parse(existing['createdAt'] as String)
              : null,
          invoiceNumber: existing['invoiceNumber'] as String?,
        );
      }
      return null;
    } catch (e) {
      // 404 Not Found = not duplicate, proceed with upload
      // Any other error = fail-open (proceed with upload, backend will catch duplicate)
      print('[HomeProvider] Duplicate check failed (fail-open): $e');
      return null;
    }
  }
}
