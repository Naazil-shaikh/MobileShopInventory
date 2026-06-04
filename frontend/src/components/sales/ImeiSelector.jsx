import { useState } from "react";
import { mobileUnitService } from "../../services/mobileUnit.service.js";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";
import { Badge } from "../ui/Badge.jsx";
import { getApiErrorMessage } from "../../utils/format.js";

export const ImeiSelector = ({
  productId,
  quantity,
  selectedUnits,
  onChange,
}) => {
  const [imeiInput, setImeiInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const addImei = async () => {
    setError("");
    if (!imeiInput.trim()) return;

    if (selectedUnits.length >= quantity) {
      setError(`Only ${quantity} IMEI(s) required`);
      return;
    }

    if (selectedUnits.some((u) => u.imei === imeiInput.trim())) {
      setError("IMEI already added");
      return;
    }

    setLoading(true);
    try {
      const unit = await mobileUnitService.searchByImei(imeiInput.trim());
      const unitProductId = unit.unit.productId?._id || unit.unit.productId;

      console.log(unit.unit);
      console.log(unit.unit.productId._id);
      console.log(productId);

      if (unitProductId !== productId) {
        setError("IMEI does not belong to this product");
        return;
      }
      if (unit.unit.status !== "in_stock") {
        setError(`Device is not in stock (status: ${unit.unit.status})`);
        return;
      }

      onChange([
        ...selectedUnits,
        { _id: unit.unit._id, imei: unit.unit.imei },
      ]);
      setImeiInput("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const removeImei = (id) => {
    onChange(selectedUnits.filter((u) => u._id !== id));
  };

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-medium text-slate-600">
        IMEI devices ({selectedUnits.length}/{quantity})
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Scan or enter IMEI"
          value={imeiInput}
          onChange={(e) => setImeiInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), addImei())
          }
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addImei}
          disabled={loading || selectedUnits.length >= quantity}
        >
          Add
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {selectedUnits.map((u) => (
          <Badge key={u._id} variant="info">
            {u.imei}
            <button
              type="button"
              className="ml-1 text-blue-900"
              onClick={() => removeImei(u._id)}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
};
