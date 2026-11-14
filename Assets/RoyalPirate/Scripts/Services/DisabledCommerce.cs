using System;
using System.Threading;
using System.Threading.Tasks;
using RoyalPirate.Domain;

namespace RoyalPirate.Services
{
    public sealed class DisabledCommerce : IPurchaseService, IRewardService
    {
        public Task VerifyReceipt(string platform, string receipt, CancellationToken cancellation) =>
            Task.FromException(new NotSupportedException("Purchases are disabled in phase 1."));
        public Task Claim(string serverIssuedClaimId, string idempotencyKey, CancellationToken cancellation) =>
            Task.FromException(new NotSupportedException("Production rewards require a server authority."));
    }
}
