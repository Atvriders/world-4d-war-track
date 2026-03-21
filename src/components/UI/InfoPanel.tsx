import React, { useEffect, useState } from 'react';
import {
  SatelliteEntity,
  AircraftEntity,
  ShipEntity,
  ConflictZone,
  ConflictEvent,
} from '../../types';
import { headingToCompass, getOrbitClass } from '../../utils/geoMath';

// ── Types ────────────────────────────────────────────────────────────────────

interface SelectedEntity {
  type: 'satellite' | 'aircraft' | 'ship' | 'conflict' | 'event';
  id: string;
  data: unknown;
}

interface InfoPanelProps {
  selectedEntity: SelectedEntity | null;
  onClose: () => void;
  onFlyTo: (lat: number, lng: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

function msToKnots(ms: number): number {
  return Math.round(ms * 1.94384);
}

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return 'N/A';
  return n.toLocaleString();
}

function getDuration(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  if (years > 0) {
    return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? `, ${months} month${months !== 1 ? 's' : ''}` : ''}`;
  }
  return `${months} month${months !== 1 ? 's' : ''}`;
}

function getIntensityFill(intensity: ConflictZone['intensity']): number {
  return { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 }[intensity] ?? 0;
}

function getIntensityColor(intensity: ConflictZone['intensity']): string {
  return { low: '#00ff88', medium: '#ffcc00', high: '#ff6600', critical: '#ff2200' }[intensity] ?? '#00ff88';
}

const eventTypeIcon: Record<ConflictEvent['type'], string> = {
  airstrike: '✈',
  'ground-battle': '⚔',
  artillery: '💥',
  naval: '⚓',
  drone: '🔺',
  missile: '🚀',
  explosion: '💣',
  other: '•',
};

const satelliteCategoryColor: Record<SatelliteEntity['category'], string> = {
  military: '#ff4444',
  spy: '#ff4444',
  reconnaissance: '#ff6600',
  navigation: '#00aaff',
  commercial: '#888888',
  weather: '#00ccff',
  starlink: '#aaaaff',
  iss: '#00ff88',
  other: '#666666',
};

const shipTypeLabel: Record<ShipEntity['type'], string> = {
  cargo: 'Cargo Vessel',
  tanker: 'Tanker',
  military: 'Military',
  warship: 'Warship',
  passenger: 'Passenger',
  fishing: 'Fishing',
  tug: 'Tug',
  research: 'Research',
  other: 'Unknown',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: 56,
    right: 0,
    width: 320,
    height: 'calc(100vh - 56px)',
    background: 'rgba(5, 15, 30, 0.95)',
    border: '1px solid rgba(0, 255, 136, 0.4)',
    borderRight: 'none',
    color: '#e0e8f0',
    fontFamily: 'monospace',
    fontSize: 12,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    zIndex: 1200,
    backdropFilter: 'blur(8px)',
    transition: 'transform 0.3s ease',
  },
  panelVisible: {
    transform: 'translateX(0)',
  },
  panelHidden: {
    transform: 'translateX(100%)',
  },
  header: {
    padding: '12px 14px 10px',
    borderBottom: '1px solid rgba(0, 255, 136, 0.25)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    minWidth: 0,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: '#00ff88',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badgeRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 2,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  closeBtn: {
    background: 'none',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    color: '#00ff88',
    cursor: 'pointer',
    fontSize: 14,
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: 2,
    lineHeight: 1,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: 'rgba(0, 255, 136, 0.6)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
    paddingBottom: 3,
    marginBottom: 2,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowLabel: {
    color: 'rgba(224, 232, 240, 0.55)',
    flexShrink: 0,
  },
  rowValue: {
    color: '#e0e8f0',
    textAlign: 'right',
    wordBreak: 'break-all',
  },
  statusDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    marginRight: 6,
    flexShrink: 0,
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
  },
  divider: {
    borderTop: '1px solid rgba(0, 255, 136, 0.12)',
    margin: '2px 0',
  },
  flyBtn: {
    width: '100%',
    padding: '8px 0',
    background: 'rgba(0, 255, 136, 0.12)',
    border: '1px solid rgba(0, 255, 136, 0.5)',
    color: '#00ff88',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: 2,
    transition: 'background 0.15s ease',
    flexShrink: 0,
  },
  footer: {
    padding: '10px 14px',
    borderTop: '1px solid rgba(0, 255, 136, 0.15)',
    flexShrink: 0,
  },
  groundTrackNote: {
    background: 'rgba(0, 255, 136, 0.06)',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    borderRadius: 2,
    padding: '6px 8px',
    color: 'rgba(0, 255, 136, 0.8)',
    fontSize: 11,
  },
  intensityBar: {
    height: 8,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    flex: 1,
  },
  intensityBarFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.4s ease',
  },
  intensityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  eventItem: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(0,255,136,0.12)',
    borderRadius: 2,
    padding: '6px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  eventItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  eventIcon: {
    fontSize: 13,
    flexShrink: 0,
  },
  eventDate: {
    color: 'rgba(0, 255, 136, 0.7)',
    fontSize: 10,
  },
  eventDesc: {
    color: '#c0ccd8',
    fontSize: 11,
    lineHeight: 1.4,
  },
  eventFatalities: {
    color: '#ff6666',
    fontSize: 10,
  },
  partiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  partyItem: {
    padding: '3px 6px',
    background: 'rgba(255,255,255,0.05)',
    borderLeft: '2px solid rgba(0,255,136,0.4)',
    borderRadius: '0 2px 2px 0',
    fontSize: 11,
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={styles.rowValue}>{value}</span>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <div style={styles.sectionLabel}>{children}</div>;
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ ...styles.badge, color, background: bg }}>
      {label}
    </span>
  );
}

// ── Section renderers ─────────────────────────────────────────────────────────

function SatelliteInfo({ entity, onFlyTo }: { entity: SatelliteEntity; onFlyTo: (lat: number, lng: number) => void }) {
  const catColor = satelliteCategoryColor[entity.category] ?? '#888888';

  return (
    <>
      <div style={styles.section}>
        <SectionHead>Status</SectionHead>
        <div style={styles.statusRow}>
          <span
            style={{
              ...styles.statusDot,
              background: entity.isActive ? '#00ff88' : '#666666',
              boxShadow: entity.isActive ? '0 0 6px #00ff88' : 'none',
            }}
          />
          <span style={{ color: entity.isActive ? '#00ff88' : '#888888' }}>
            {entity.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div style={styles.section}>
        <SectionHead>Position</SectionHead>
        <InfoRow label="Latitude" value={`${entity.lat.toFixed(2)}°`} />
        <InfoRow label="Longitude" value={`${entity.lng.toFixed(2)}°`} />
        <InfoRow label="Altitude" value={`${entity.alt.toLocaleString()} km · ${getOrbitClass(entity.alt)}`} />
      </div>

      <div style={styles.section}>
        <SectionHead>Dynamics</SectionHead>
        <InfoRow label="Velocity" value={`${entity.velocity.toFixed(2)} km/s`} />
        <InfoRow label="Heading" value={`${Math.round(entity.heading)}° ${headingToCompass(entity.heading)}`} />
      </div>

      <div style={styles.section}>
        <SectionHead>Identification</SectionHead>
        <InfoRow label="Country" value={entity.country} />
        <InfoRow label="NORAD ID" value={entity.id} />
        <InfoRow label="Footprint" value={`${entity.footprintRadius.toLocaleString()} km radius`} />
      </div>

      <div style={styles.groundTrackNote}>
        ◎ Next 90 min orbit path active
      </div>
    </>
  );
}

function AircraftInfo({ entity, onFlyTo }: { entity: AircraftEntity; onFlyTo: (lat: number, lng: number) => void }) {
  const vertRateLabel = () => {
    if (entity.verticalRate > 1) return `↑ Climbing (${entity.verticalRate.toFixed(1)} m/s)`;
    if (entity.verticalRate < -1) return `↓ Descending (${Math.abs(entity.verticalRate).toFixed(1)} m/s)`;
    return '→ Level';
  };

  return (
    <>
      <div style={styles.section}>
        <SectionHead>Status</SectionHead>
        <div style={styles.statusRow}>
          <span
            style={{
              ...styles.statusDot,
              background: entity.onGround ? '#888888' : '#00ff88',
              boxShadow: entity.onGround ? 'none' : '0 0 6px #00ff88',
            }}
          />
          <span style={{ color: entity.onGround ? '#888888' : '#00ff88' }}>
            {entity.onGround ? 'On Ground' : 'Airborne'}
          </span>
        </div>
        <InfoRow label="Country" value={entity.country} />
      </div>

      <div style={styles.section}>
        <SectionHead>Position &amp; Altitude</SectionHead>
        <InfoRow label="Latitude" value={`${entity.lat.toFixed(2)}°`} />
        <InfoRow label="Longitude" value={`${entity.lng.toFixed(2)}°`} />
        <InfoRow
          label="Altitude"
          value={`${entity.altitude.toLocaleString()} m · ${metersToFeet(entity.altitude).toLocaleString()} ft`}
        />
      </div>

      <div style={styles.section}>
        <SectionHead>Dynamics</SectionHead>
        <InfoRow
          label="Speed"
          value={`${entity.velocity.toFixed(1)} m/s · ${msToKnots(entity.velocity)} kts`}
        />
        <InfoRow label="Heading" value={`${Math.round(entity.heading)}° ${headingToCompass(entity.heading)}`} />
        <InfoRow label="Vert. Rate" value={vertRateLabel()} />
      </div>

      <div style={styles.section}>
        <SectionHead>Identification</SectionHead>
        <InfoRow label="ICAO24" value={<span style={{ color: '#aaddff', fontFamily: 'monospace' }}>{entity.icao24.toUpperCase()}</span>} />
        {entity.squawk && (
          <InfoRow label="Squawk" value={entity.squawk} />
        )}
      </div>
    </>
  );
}

function ShipInfo({ entity, onFlyTo }: { entity: ShipEntity; onFlyTo: (lat: number, lng: number) => void }) {
  return (
    <>
      <div style={styles.section}>
        <SectionHead>Identification</SectionHead>
        <InfoRow label="Flag" value={entity.flag} />
        <InfoRow label="MMSI" value={<span style={{ fontFamily: 'monospace', color: '#aaddff' }}>{entity.mmsi}</span>} />
        <InfoRow label="Type" value={shipTypeLabel[entity.type]} />
        {entity.length !== undefined && (
          <InfoRow label="Length" value={`${entity.length} m`} />
        )}
      </div>

      <div style={styles.section}>
        <SectionHead>Navigation</SectionHead>
        <InfoRow label="Latitude" value={`${entity.lat.toFixed(2)}°`} />
        <InfoRow label="Longitude" value={`${entity.lng.toFixed(2)}°`} />
        <InfoRow label="Speed" value={`${entity.speed.toFixed(1)} kts`} />
        <InfoRow label="Heading" value={`${Math.round(entity.heading)}° ${headingToCompass(entity.heading)}`} />
        {entity.destination && (
          <InfoRow label="Destination" value={entity.destination} />
        )}
      </div>
    </>
  );
}

function ConflictInfo({ entity, onFlyTo }: { entity: ConflictZone; onFlyTo: (lat: number, lng: number) => void }) {
  const intensityFill = getIntensityFill(entity.intensity);
  const intensityColor = getIntensityColor(entity.intensity);
  const recentEvents = [...entity.events]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <>
      <div style={styles.section}>
        <SectionHead>Conflict Details</SectionHead>
        <div style={styles.intensityRow}>
          <span style={styles.rowLabel}>Intensity</span>
          <div style={styles.intensityBar}>
            <div
              style={{
                ...styles.intensityBarFill,
                width: `${intensityFill * 100}%`,
                background: intensityColor,
              }}
            />
          </div>
          <span style={{ color: intensityColor, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', flexShrink: 0 }}>
            {entity.intensity}
          </span>
        </div>
        <InfoRow
          label="Duration"
          value={`Since ${entity.startDate} (${getDuration(entity.startDate)})`}
        />
        <InfoRow label="Countries" value={entity.countries.join(', ')} />
      </div>

      <div style={styles.section}>
        <SectionHead>Parties Involved</SectionHead>
        <div style={styles.partiesList}>
          {entity.parties.map((party) => (
            <div key={`party-${party}`} style={styles.partyItem}>{party}</div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <SectionHead>Casualties</SectionHead>
        {entity.casualties?.total != null && (
          <InfoRow label="Total" value={<span style={{ color: '#ff6666', fontWeight: 700 }}>{formatNumber(entity.casualties.total)}</span>} />
        )}
        {entity.casualties.military !== undefined && (
          <InfoRow label="Military" value={formatNumber(entity.casualties.military)} />
        )}
        {entity.casualties.civilian !== undefined && (
          <InfoRow label="Civilian" value={formatNumber(entity.casualties.civilian)} />
        )}
        {entity.casualties.displaced !== undefined && (
          <InfoRow label="Displaced" value={formatNumber(entity.casualties.displaced)} />
        )}
        {entity.casualtySources?.total && (
          <div style={{
            marginTop: 4,
            padding: '3px 0',
            color: 'rgba(160, 175, 190, 0.45)',
            fontSize: 9,
            fontStyle: 'italic',
            letterSpacing: '0.02em',
          }}>
            Sources: {[
              entity.casualtySources?.total,
              entity.casualtySources?.military,
              entity.casualtySources?.civilian,
              entity.casualtySources?.displaced,
            ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}
          </div>
        )}
      </div>

      {entity.description && (
        <div style={styles.section}>
          <SectionHead>Overview</SectionHead>
          <p style={{ color: '#c0ccd8', fontSize: 11, lineHeight: 1.55, margin: 0 }}>
            {entity.description}
          </p>
        </div>
      )}

      {recentEvents.length > 0 && (
        <div style={styles.section}>
          <SectionHead>Recent Events</SectionHead>
          {recentEvents.map((evt) => (
            <div key={evt.id} style={styles.eventItem}>
              <div style={styles.eventItemHeader}>
                <span style={styles.eventIcon}>{eventTypeIcon[evt.type]}</span>
                <span style={styles.eventDate}>{evt.date}</span>
                {evt.fatalities > 0 && (
                  <span style={{ ...styles.eventFatalities, marginLeft: 'auto' }}>
                    ☠ {evt.fatalities}
                  </span>
                )}
              </div>
              <div style={styles.eventDesc}>{evt.description}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const InfoPanel: React.FC<InfoPanelProps> = ({ selectedEntity, onClose, onFlyTo }) => {
  const [visible, setVisible] = useState(false);

  // Drive CSS transition: mount -> slide in, entity cleared -> slide out then cleanup handled by parent
  useEffect(() => {
    if (selectedEntity) {
      // Tiny delay so the initial render is in the "hidden" position before we animate in
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    } else {
      setVisible(false);
    }
  }, [selectedEntity]);

  if (!selectedEntity) return null;

  const { type, data } = selectedEntity;

  // ── Derive header info ────────────────────────────────────────────────────

  let title = '';
  let badges: React.ReactNode[] = [];
  let flyLat = 0;
  let flyLng = 0;

  if (type === 'satellite') {
    const sat = data as SatelliteEntity;
    title = sat.name;
    const catColor = satelliteCategoryColor[sat.category] ?? '#888888';
    badges = [
      <Badge
        key="cat"
        label={sat.category}
        color={catColor}
        bg={`${catColor}22`}
      />,
    ];
    flyLat = sat.lat;
    flyLng = sat.lng;
  } else if (type === 'aircraft') {
    const ac = data as AircraftEntity;
    title = ac.callsign || ac.icao24?.toUpperCase() || 'UNKNOWN';
    if (ac.isMilitary) {
      badges = [<Badge key="mil" label="Military" color="#ff4444" bg="rgba(255,68,68,0.15)" />];
    }
    flyLat = ac.lat;
    flyLng = ac.lng;
  } else if (type === 'ship') {
    const ship = data as ShipEntity;
    title = ship.name;
    badges = [
      <Badge
        key="type"
        label={shipTypeLabel[ship.type]}
        color={ship.type === 'warship' || ship.type === 'military' ? '#ff4444' : '#00aaff'}
        bg={ship.type === 'warship' || ship.type === 'military' ? 'rgba(255,68,68,0.15)' : 'rgba(0,170,255,0.12)'}
      />,
    ];
    flyLat = ship.lat;
    flyLng = ship.lng;
  } else if (type === 'conflict') {
    const conflict = data as ConflictZone;
    title = conflict.name;
    const statusConfig: Record<ConflictZone['status'], { label: string; color: string; bg: string }> = {
      active: { label: 'Active', color: '#ff4444', bg: 'rgba(255,68,68,0.15)' },
      ceasefire: { label: 'Ceasefire', color: '#888888', bg: 'rgba(136,136,136,0.15)' },
      escalating: { label: 'Escalating', color: '#ff4444', bg: 'rgba(255,68,68,0.15)' },
      'de-escalating': { label: 'De-escalating', color: '#ffcc00', bg: 'rgba(255,204,0,0.12)' },
    };
    const sc = statusConfig[conflict.status];
    badges = [
      <Badge key="status" label={sc.label} color={sc.color} bg={sc.bg} />,
    ];
    // Use centroid of first polygon coordinate set if available, fallback to 0,0
    try {
      const geo = conflict.geoJSON?.geometry;
      if (geo?.type === 'Polygon') {
        const coords = (geo.coordinates as number[][][])[0];
        const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
        const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        flyLat = avgLat;
        flyLng = avgLng;
      } else if (geo?.type === 'MultiPolygon') {
        const coords = (geo.coordinates as number[][][][])[0][0];
        const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
        const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        flyLat = avgLat;
        flyLng = avgLng;
      }
    } catch {
      // keep defaults
    }
  } else if (type === 'event') {
    const evt = data as ConflictEvent;
    title = evt.type.replace('-', ' ').toUpperCase();
    badges = [
      <Badge key="etype" label={evt.type} color="#ffcc00" bg="rgba(255,204,0,0.12)" />,
    ];
    flyLat = evt.lat;
    flyLng = evt.lng;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        ...styles.panel,
        ...(visible ? styles.panelVisible : styles.panelHidden),
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.title} title={title}>{title}</div>
          {badges.length > 0 && <div style={styles.badgeRow}>{badges}</div>}
        </div>
        <button
          style={styles.closeBtn}
          onClick={onClose}
          title="Close"
          aria-label="Close info panel"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {type === 'satellite' && (
          <SatelliteInfo entity={data as SatelliteEntity} onFlyTo={onFlyTo} />
        )}
        {type === 'aircraft' && (
          <AircraftInfo entity={data as AircraftEntity} onFlyTo={onFlyTo} />
        )}
        {type === 'ship' && (
          <ShipInfo entity={data as ShipEntity} onFlyTo={onFlyTo} />
        )}
        {type === 'conflict' && (
          <ConflictInfo entity={data as ConflictZone} onFlyTo={onFlyTo} />
        )}
        {type === 'event' && (() => {
          const evt = data as ConflictEvent;
          return (
            <div style={styles.section}>
              <SectionHead>Event Details</SectionHead>
              <InfoRow label="Date" value={evt.date} />
              <InfoRow label="Type" value={evt.type} />
              <InfoRow label="Latitude" value={`${evt.lat.toFixed(4)}°`} />
              <InfoRow label="Longitude" value={`${evt.lng.toFixed(4)}°`} />
              <InfoRow
                label="Fatalities"
                value={
                  <span style={{ color: evt.fatalities > 0 ? '#ff6666' : '#888888' }}>
                    {evt.fatalities > 0 ? evt.fatalities : 'None reported'}
                  </span>
                }
              />
              <InfoRow label="Source" value={evt.source} />
              <div style={{ marginTop: 4 }}>
                <div style={styles.sectionLabel}>Description</div>
                <p style={{ color: '#c0ccd8', fontSize: 11, lineHeight: 1.55, margin: 0 }}>
                  {evt.description}
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Footer — Fly To button */}
      <div style={styles.footer}>
        <button
          style={styles.flyBtn}
          onClick={() => onFlyTo(flyLat, flyLng)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.22)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.12)';
          }}
        >
          ◎ Fly To Location
        </button>
      </div>
    </div>
  );
};

export default InfoPanel;
