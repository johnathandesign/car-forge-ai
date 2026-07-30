// Design shape expected by the 3D garage layer (CarModel / GarageCanvas).
// This is intentionally separate from the Car Design Layer's DesignState
// in ./design.ts, which uses a flat, catalog-driven shape. This one is
// nested (exterior/interior) to match how CarModel.tsx reads it.
export interface DesignState {
  exterior: {
    bodyColor: string;
    windowTint: string;
    rims: string;
  };
  interior: {
    seatColor: string;
    seatMaterial: string;
  };
}
