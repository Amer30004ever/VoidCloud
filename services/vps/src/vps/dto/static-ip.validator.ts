import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ipInCidr, ipToLong } from '../../proxmox/vm-network-isolation';

/**
 * Validates a customer-supplied static IP for a tenant VPS.
 *
 * Security model (Prompt 2.1 + Prompt 0.15): a tenant may only request an IP
 * that lives *inside the operator-managed Proxmox IP pool*. Anything else is
 * rejected so a tenant cannot:
 *   - grab an address outside the pool (would land on another network /
 *     infrastructure segment),
 *   - collide with the pool gateway,
 *   - claim the network/broadcast addresses,
 *   - or grab an address below the pool's allocation floor (reserved for
 *     gateway / management / future infra).
 *
 * The per-VM firewall (Prompt 0.15) is applied identically regardless of which
 * in-pool IP is assigned — this validator only constrains *which* in-pool IP a
 * tenant may name, not whether isolation applies.
 */
@ValidatorConstraint({ name: 'isInProxmoxPool', async: false })
export class IsInProxmoxPoolConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || !value.trim()) return false;
    const ip = value.trim();

    const poolCidr = (
      process.env.PROXMOX_IP_POOL_CIDR ?? '10.51.100.0/24'
    ).trim();
    const parts = ip.split('.').map((p) => Number(p));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
      return false;
    }
    const last = parts[3];

    // Must be inside the managed pool.
    if (!ipInCidr(ip, poolCidr)) return false;

    // Reject network / broadcast addresses.
    if (last === 0 || last === 255) return false;

    // Reject the gateway (and any address below the allocation floor, which is
    // reserved for gateway / management / future infra).
    const gateway = (process.env.PROXMOX_GATEWAY ?? '').trim();
    if (gateway && ipToLong(ip) !== null && ip === gateway) return false;

    const poolStart = Number(process.env.PROXMOX_IP_POOL_START ?? 50);
    if (Number.isFinite(poolStart) && last < poolStart) return false;

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return (
      args.property +
      ' must be a valid IPv4 address inside the managed IP pool (' +
      (process.env.PROXMOX_IP_POOL_CIDR ?? '10.51.100.0/24') +
      '), excluding the gateway and reserved addresses'
    );
  }
}

export function IsInProxmoxPool(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsInProxmoxPoolConstraint,
    });
  };
}
