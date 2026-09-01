class Product {
  final String id;
  final String slug;
  final String name;
  final double basePrice;
  final List<String> imageUrls;
  final int quantityAvailable;

  Product({
    required this.id,
    required this.slug,
    required this.name,
    required this.basePrice,
    required this.imageUrls,
    required this.quantityAvailable,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    final inventory = json['inventory'] as Map<String, dynamic>?;
    final available = inventory != null
        ? (inventory['quantityOnHand'] ?? 0) - (inventory['reservedQuantity'] ?? 0)
        : 0;
    return Product(
      id: json['id'],
      slug: json['slug'],
      name: json['name'],
      basePrice: double.tryParse(json['basePrice'].toString()) ?? 0,
      imageUrls: ((json['images'] as List?) ?? []).map((e) => e['url'] as String).toList(),
      quantityAvailable: available is int ? available : 0,
    );
  }
}
