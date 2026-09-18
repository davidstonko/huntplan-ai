/**
 * @file useOpenPlanner.test.ts
 * @description The cross-mode "open the Camp/Hike planner" hook. Same
 * mode → navigate inside the current Tab.Navigator; different mode →
 * switch the active mode and address the nested route via the root
 * Stack, exactly as the header ActivityModePicker does.
 */

const mockNavigate = jest.fn();
const mockSetActiveMode = jest.fn();
let mockActiveMode = 'hunt';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../../context/ActivityModeContext', () => ({
  useActivityMode: () => ({ activeMode: mockActiveMode, setActiveMode: mockSetActiveMode }),
}));
// The hook is a thin useCallback wrapper; run it without a renderer.
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: (fn: unknown) => fn,
}));

import { useOpenPlanner } from '../useOpenPlanner';

describe('useOpenPlanner', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSetActiveMode.mockClear();
  });

  it('same mode: navigates to PlanTab with the nested planner screen', () => {
    mockActiveMode = 'camp';
    useOpenPlanner()('camp', { campgroundId: 'x' });
    expect(mockSetActiveMode).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('PlanTab', {
      screen: 'CampTripPlannerMain',
      params: { campgroundId: 'x' },
    });
  });

  it('different mode: switches mode, then addresses the mode tabs → PlanTab → planner', () => {
    mockActiveMode = 'hunt';
    useOpenPlanner()('hike');
    expect(mockSetActiveMode).toHaveBeenCalledWith('hike');
    expect(mockNavigate).toHaveBeenCalledWith('HikeTabs', {
      screen: 'PlanTab',
      params: { screen: 'HikeTripPlannerMain', params: undefined },
    });
  });
});
