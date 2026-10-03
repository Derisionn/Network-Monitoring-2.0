# Perfect Enterprise Agent Implementation Plan

This plan details the structural changes required to elevate the Python Agent to an enterprise-grade standard. It focuses on solving the deep discovery reboot loop, normalizing protocol variations, and drastically reducing noise through intelligent edge-filtering.

## Phase 1: Building the Edge Normalizer & Filter
Currently, the agent blindly maps whatever strings SNMP or WMI provide into the `interfaces` dictionary inside the JSON payload. We will intercept this data right before the JSON payload is constructed.

### Execution:
1. **Target File:** `probe-agent/core/publisher.py` (inside the `push_results` function, where the final `DeviceTelemetryPayload` is built).
2. **Action:** Implement a `clean_and_filter_interfaces(interfaces_dict)` function.

#### Step A: String Normalization
- Strip null bytes: `name = name.replace('\x00', '')`
- Unify Brackets/Parens: `name = name.replace('[R]', '(R)')`
- *Outcome: WMI and SNMP will now report the exact same interface name, allowing Cassandra to merge their data into a single, cohesive graph.*

#### Step B: The Garbage Blacklist
Iterate through the interfaces and immediately drop any interface whose name contains known virtual adapters:
- `WAN Miniport`
- `Npcap`
- `QoS Packet`
- `WFP Native MAC Layer`
- `Filter Driver`
- `Loopback`
- `Bluetooth Device`
- `6to4 Adapter`
- `Teredo Tunneling`
- *Outcome: Drops 90% of the useless virtual adapters Windows creates.*

#### Step C: The Dead Port Rule
For any interface that survives the Blacklist, apply a strict traffic rule:
- `if status == "DOWN" and in_octets == 0: drop_interface()`
- *Outcome: Perfectly drops unused physical ports and inactive hypervisor switches, while safely keeping actual hardware ports that have just gone offline (since their `in_octets` will be > 0).*

## Impact Summary
By executing this plan, your 54-interface SNMP payload will shrink to 1 or 2 active interfaces. Over the span of a single month, this prevents **26.4 million useless rows** from being written to your Cassandra database *per Windows Server monitored*. 

**Next Steps:** Whenever you give the green light, I will modify `polling.py` and `publisher.py` to implement these changes.
