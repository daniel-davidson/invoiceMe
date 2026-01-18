import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';

class Vendor {
  final String id;
  final String name;
  final int? invoiceCount;
  final double? monthlyLimit;

  Vendor({
    required this.id,
    required this.name,
    this.invoiceCount,
    this.monthlyLimit,
  });

  factory Vendor.fromJson(Map<String, dynamic> json) {
    return Vendor(
      id: json['id'] as String,
      name: json['name'] as String,
      invoiceCount: json['invoiceCount'] as int?,
      monthlyLimit: json['monthlyLimit'] != null
          ? (json['monthlyLimit'] as num).toDouble()
          : null,
    );
  }
}

final vendorsProvider =
    StateNotifierProvider<VendorsNotifier, AsyncValue<List<Vendor>>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return VendorsNotifier(apiClient);
});

class VendorsNotifier extends StateNotifier<AsyncValue<List<Vendor>>> {
  final ApiClient _apiClient;
  final ImagePicker _imagePicker = ImagePicker();

  VendorsNotifier(this._apiClient) : super(const AsyncValue.loading()) {
    loadVendors();
  }

  Future<void> loadVendors() async {
    state = const AsyncValue.loading();
    try {
      final response = await _apiClient.get('/vendors?includeInvoiceCount=true');
      final List<dynamic> data = response.data as List<dynamic>;
      final vendors = data
          .map((json) => Vendor.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(vendors);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> addVendor(String name) async {
    try {
      await _apiClient.post('/vendors', data: {'name': name});
      await loadVendors();
    } catch (e) {
      // Handle error
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

  Future<void> uploadFromCamera() async {
    try {
      final XFile? image = await _imagePicker.pickImage(source: ImageSource.camera);
      if (image != null) {
        await _uploadFile(image.path, image.name);
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<void> uploadFromGallery() async {
    try {
      final XFile? image = await _imagePicker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        await _uploadFile(image.path, image.name);
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<void> uploadPdf() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
      );
      if (result != null && result.files.single.path != null) {
        await _uploadFile(result.files.single.path!, result.files.single.name);
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<void> _uploadFile(String path, String name) async {
    try {
      await _apiClient.uploadFile('/invoices/upload', path, name);
      await loadVendors();
    } catch (e) {
      // Handle error
    }
  }
}
