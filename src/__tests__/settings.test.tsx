import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';
import { useAppActions, useConnectivity } from '@/state';

jest.mock('@/state', () => ({
  useConnectivity: jest.fn(),
  useAppActions: jest.fn(),
}));

interface Mocks {
  setOnline: jest.Mock;
  resetDemoData: jest.Mock;
}

function setup({ online = true }: { online?: boolean } = {}): Mocks {
  const mocks: Mocks = {
    setOnline: jest.fn(),
    resetDemoData: jest.fn().mockResolvedValue(undefined),
  };
  (useConnectivity as jest.Mock).mockReturnValue({ online, setOnline: mocks.setOnline });
  (useAppActions as jest.Mock).mockReturnValue({ resetDemoData: mocks.resetDemoData });
  return mocks;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Settings: demo connection', () => {
  it('explains the switch and shows the current state', async () => {
    setup({ online: true });
    await render(<SettingsScreen />);

    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.getByText('Orders send as soon as they are saved')).toBeTruthy();
    expect(screen.getByText(/There is no real server in this demo/)).toBeTruthy();
  });

  it('turns the connection off from the switch', async () => {
    const mocks = setup({ online: true });
    await render(<SettingsScreen />);

    const toggle = screen.getByRole('switch', { name: 'Online connection' });
    expect(toggle.props.accessibilityState).toEqual({ checked: true });
    await fireEvent.press(toggle);
    expect(mocks.setOnline).toHaveBeenCalledWith(false);
  });

  it('turns the connection on from offline', async () => {
    const mocks = setup({ online: false });
    await render(<SettingsScreen />);

    expect(screen.getByText('Offline')).toBeTruthy();
    await fireEvent.press(screen.getByRole('switch', { name: 'Online connection' }));
    expect(mocks.setOnline).toHaveBeenCalledWith(true);
  });
});

describe('Settings: reset demo data', () => {
  it('does not reset until the inline confirmation is pressed', async () => {
    const mocks = setup();
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reset demo data' }));
    expect(screen.getByText(/This removes every order on this device/)).toBeTruthy();
    expect(mocks.resetDemoData).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Reset demo data' }));
    await waitFor(() => expect(mocks.resetDemoData).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Demo data reset to the start of the day.')).toBeTruthy();
  });

  it('keeps the data when the reset is cancelled', async () => {
    const mocks = setup();
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reset demo data' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mocks.resetDemoData).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Reset demo data' })).toBeTruthy();
  });

  it('shows a failed reset inline and keeps the confirmation open', async () => {
    const mocks = setup();
    mocks.resetDemoData.mockRejectedValueOnce(new Error('Database is busy'));
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reset demo data' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reset demo data' }));

    expect(await screen.findByText('Database is busy')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });
});

describe('Settings: about', () => {
  it('shows the version, storage, licence and source link', async () => {
    setup();
    await render(<SettingsScreen />);

    expect(screen.getByText('0.1.0')).toBeTruthy();
    expect(screen.getByText('MIT')).toBeTruthy();
    expect(screen.getByText('Simulated for this demo')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Source: github.com/hardik88t/fieldbook' }),
    ).toBeTruthy();
  });
});
