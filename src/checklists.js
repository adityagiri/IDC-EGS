// Device types with ready-made service checklists.
// Engineers only tick boxes and pick dropdowns — no free typing needed except remarks.

export const DEVICE_TYPES = {
  'Desktop / Laptop': [
    'Physical cleaning done (CPU/fan/vents)',
    'OS updates installed',
    'Antivirus updated + full scan run',
    'Disk health checked (SMART)',
    'Temp files / junk cleaned',
    'Backup verified',
    'Network connectivity tested',
    'Keyboard / mouse / peripherals checked',
    'Unwanted software removed',
  ],
  'Printer / Scanner': [
    'Rollers and paper path cleaned',
    'Printhead / drum condition checked',
    'Toner / cartridge level checked',
    'Test print taken — quality OK',
    'Paper tray and feed mechanism checked',
    'Network / USB connectivity OK',
    'Counters noted (page count)',
  ],
  'CCTV / NVR / DVR': [
    'All cameras live and recording',
    'HDD health checked + recording days verified',
    'Camera lenses / housings cleaned',
    'Cables and connectors checked',
    'Date-time sync correct',
    'Remote / mobile view working',
    'NVR firmware checked',
  ],
  'Server': [
    'RAID / disk health verified',
    'Backup job success verified',
    'Event logs reviewed',
    'Windows / OS patches updated',
    'Antivirus / EDR status OK',
    'Temperature and fans normal',
    'Storage capacity checked',
    'UPS connection verified',
  ],
  'Switch / Router / Access Point': [
    'Device uptime and status checked',
    'Firmware version checked',
    'Port status / errors reviewed',
    'Cabling and patch panel neat',
    'WiFi signal tested at key points',
    'Configuration backup taken',
  ],
  'Firewall': [
    'License / subscription valid',
    'Firmware updated',
    'Rules and policies reviewed',
    'VPN tunnels working',
    'Logs reviewed for threats',
    'Configuration backup taken',
  ],
  'UPS / Inverter': [
    'Battery health test done',
    'Load percentage checked',
    'Runtime / backup test done',
    'Input-output connections checked',
    'Physical cleaning done',
  ],
  'Biometric / Access Control': [
    'Sensor / reader cleaned',
    'Sync with attendance server OK',
    'Door lock / relay tested',
    'Date-time correct',
    'Logs backup taken',
  ],
  'Other': [
    'Physical inspection done',
    'Functionality tested',
    'Cleaning done',
    'Connectivity checked',
  ],
}

export const DEVICE_TYPE_LIST = Object.keys(DEVICE_TYPES)

export const RESULT_OPTIONS = [
  'Working OK',
  'Working with minor issues',
  'Needs part replacement',
  'Not working — repair required',
  'Dead — replacement advised',
]

export const ISSUE_OPTIONS = [
  'No issue found',
  'Hardware fault',
  'Software issue',
  'Network issue',
  'Power / electrical issue',
  'Consumable needed (toner/battery/etc.)',
  'User training given',
  'Escalated to senior engineer',
  'Under observation',
]

export const TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
export const TICKET_STATUSES = ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed']
