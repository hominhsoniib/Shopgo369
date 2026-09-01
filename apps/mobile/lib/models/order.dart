class OrderSummary {
  final String id;
  final String orderCode;
  final String status;
  final double totalAmount;

  OrderSummary({required this.id, required this.orderCode, required this.status, required this.totalAmount});

  factory OrderSummary.fromJson(Map<String, dynamic> json) => OrderSummary(
        id: json['id'],
        orderCode: json['orderCode'],
        status: json['status'],
        totalAmount: double.tryParse(json['totalAmount'].toString()) ?? 0,
      );
}
