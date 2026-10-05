using CodigoJudaico.Api.Data;

namespace CodigoJudaico.Api.Services;

public static class BookEntitlements
{
    public static IQueryable<string> PurchasedBookIds(AppDbContext db, Guid userId) =>
        db.UserBookPurchases.Where(x => x.UserId == userId).Select(x => x.BookId)
            .Union(db.KirvanoSaleBooks
                .Where(x => x.Sale.UserId == userId && x.Sale.ApprovedAt != null
                    && x.Sale.Status != "REFUNDED" && x.Sale.Status != "CHARGEBACK")
                .Select(x => x.BookId));
}
