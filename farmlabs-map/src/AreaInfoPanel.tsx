import React from "react";

type Props = {
  area: number | null;
};

function format(num: number, digits = 2) {
  return num.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function AreaInfoPanel({ area }: Props) {
  if (!area || area <= 0) return null;

  const sqMeters = area;
  const sqKilometers = area / 1e6;
  const sqFeet = area * 10.7639;
  const acres = area * 0.000247105;
  const sqMiles = area * 0.000000386102;

  return (
    <table style={{ background: "#fff", border: "1px solid #ccc", margin: 8 }}>
      <tbody>
        <tr>
          <td>Sq. Meters</td>
          <td>{format(sqMeters, 2)}</td>
        </tr>
        <tr>
          <td>Sq. Kilometers</td>
          <td>{format(sqKilometers, 2)}</td>
        </tr>
        <tr>
          <td>Sq. Feet</td>
          <td>{format(sqFeet, 2)}</td>
        </tr>
        <tr>
          <td>Acres</td>
          <td>{format(acres, 2)}</td>
        </tr>
        <tr>
          <td>Sq. Miles</td>
          <td>{format(sqMiles, 2)}</td>
        </tr>
      </tbody>
    </table>
  );
}