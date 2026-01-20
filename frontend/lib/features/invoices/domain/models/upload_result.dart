class UploadResult {
  final String invoiceId;
  final String extractedVendorId;
  final String extractedVendorName;
  final double confidence;
  final bool isNewVendor;

  UploadResult({
    required this.invoiceId,
    required this.extractedVendorId,
    required this.extractedVendorName,
    required this.confidence,
    required this.isNewVendor,
  });

  factory UploadResult.fromJson(Map<String, dynamic> json) {
    return UploadResult(
      invoiceId: json['invoice']['id'] as String,
      extractedVendorId: json['vendor']['id'] as String,
      extractedVendorName: json['vendor']['name'] as String,
      confidence: (json['vendor']['confidence'] as num?)?.toDouble() ?? 0.0,
      isNewVendor: json['vendor']['isNew'] as bool? ?? false,
    );
  }
}
