class UploadResult {
  final String invoiceId;
  final String? extractedVendorId;
  final String extractedVendorName;
  final double confidence;
  final bool isNewVendor;

  UploadResult({
    required this.invoiceId,
    this.extractedVendorId,
    required this.extractedVendorName,
    required this.confidence,
    required this.isNewVendor,
  });

  factory UploadResult.fromJson(Map<String, dynamic> json) {
    // Handle both scenarios:
    // 1. Vendor matched: json has 'vendor' object
    // 2. Vendor needs manual assignment: json has 'extractedVendorNameCandidate'
    final vendorData = json['vendor'];
    
    return UploadResult(
      invoiceId: json['invoice']['id'] as String,
      extractedVendorId: vendorData?['id'] ?? json['invoice']?['vendorId'],
      extractedVendorName: vendorData?['name'] ?? 
          json['extractedVendorNameCandidate'] ?? 
          'Unknown vendor',
      confidence: (vendorData?['confidence'] as num?)?.toDouble() ?? 0.0,
      isNewVendor: vendorData?['isNew'] as bool? ?? false,
    );
  }
}
