import React, { useState, useMemo } from "react";
import { generateAndDownloadMultiple } from "./PaystubGenerator";
import { localTaxRates } from "../data/localTaxes";
import {
  Input,
  Field,
  HStack,
  Portal,
  Select,
  createListCollection,
  Flex,
  Box,
  VStack,
  Button,
  Checkbox
} from "@chakra-ui/react";

export default function PaystubForm() {
  const [formData, setFormData] = useState({
    name: "",
    ssn: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    company: "",
    companyAddress: "",
    companyCity: "",
    companyState: "",
    companyZip: "",
    companyPhone: "",
    hireDate: "",
    rate: "",
    payFrequency: "biweekly",
    payDay: "Friday",
    numStubs: 1,
    hoursList: "",
    overtimeList: "",
    includeLocalTax: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const frameworks = createListCollection({
    items: [
      { label: "Weekly", value: "weekly" },
      { label: "BiWeekly", value: "biweekly" },
    ],
  });

  const inputGradientStyle = {
  background: "linear-gradient(135deg, rgba(192,132,252,0.15), rgba(244,114,182,0.15))",
  border: "1px solid rgba(192,132,252,0.3)",
  borderRadius: "6px",
  color: "white",
  _placeholder: { color: "rgb(156 163 175)" },
  _focus: {
    outline: "none",
    borderColor: "rgb(192,132,252)",
    boxShadow: "0 0 12px rgba(192,132,252,0.5)",
  },
};


  const handleGenerate = async (e) => {
    e.preventDefault();
    const preparedData = {
      ...formData,
      rate: parseFloat(formData.rate) || 0,
      numStubs: parseInt(formData.numStubs) || 1,
    };
    await generateAndDownloadMultiple(preparedData);
  };

  const DAY_MAP = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  function nextWeekday(date, weekday) {
    const result = new Date(date);
    const target = DAY_MAP[weekday];
    if (target === undefined) return result;
    while (result.getDay() !== target) {
      result.setDate(result.getDate() + 1);
    }
    return result;
  }

  const preview = useMemo(() => {
    const rate = parseFloat(formData.rate) || 0;
    const numStubs = parseInt(formData.numStubs) || 1;
    const hoursArray =
      formData.hoursList
        .split(",")
        .map((h) => parseFloat(h.trim()) || 0)
        .slice(0, numStubs) || [];
    const overtimeArray =
      formData.overtimeList
        .split(",")
        .map((h) => parseFloat(h.trim()) || 0)
        .slice(0, numStubs) || [];

    const defaultHours = formData.payFrequency === "weekly" ? 40 : 80;
    const results = hoursArray.map((hrs, i) => {
      const baseHours = hrs || defaultHours;
      const overtime = overtimeArray[i] || 0;
      return rate * baseHours + rate * 1.5 * overtime;
    });

    const totalGross = results.reduce((a, b) => a + b, 0);
    const state = formData.state?.toUpperCase() || "";
    const locationKey = `${formData.city?.trim()}, ${state}`;
    const stateRates = {
      AL: 0.05, AK: 0, AZ: 0.025, AR: 0.047, CA: 0.06, CO: 0.0455, CT: 0.05,
      DE: 0.052, FL: 0, GA: 0.0575, HI: 0.07, ID: 0.059, IL: 0.0495, IN: 0.0323,
      IA: 0.05, KS: 0.0525, KY: 0.045, LA: 0.045, ME: 0.0715, MD: 0.0575,
      MA: 0.05, MI: 0.0425, MN: 0.055, MS: 0.05, MO: 0.05, MT: 0.0675, NE: 0.05,
      NV: 0, NH: 0, NJ: 0.0637, NM: 0.049, NY: 0.064, NC: 0.0475, ND: 0.027,
      OH: 0.035, OK: 0.05, OR: 0.08, PA: 0.0307, RI: 0.0375, SC: 0.07, SD: 0,
      TN: 0, TX: 0, UT: 0.0485, VT: 0.065, VA: 0.0575, WA: 0, WV: 0.065,
      WI: 0.053, WY: 0,
    };

    const local = localTaxRates[locationKey];
    const stateTax = totalGross * (stateRates[state] || 0);
    const localTax =
      formData.includeLocalTax && local ? totalGross * local.rate : 0;
    const ssTax = totalGross * 0.062;
    const medTax = totalGross * 0.0145;
    const totalTaxes = ssTax + medTax + stateTax + localTax;
    const netPay = totalGross - totalTaxes;

    const hireDate = formData.hireDate ? new Date(formData.hireDate) : new Date();
    const payFrequency = formData.payFrequency || "weekly";
    const periodLength = payFrequency === "biweekly" ? 14 : 7;
    const payDay = formData.payDay || "Friday";

    let schedule = [];
    let startDate = new Date(hireDate);

    for (let i = 0; i < numStubs; i++) {
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + periodLength - 1);
      const payDate = nextWeekday(new Date(endDate), payDay);
      schedule.push({
        stub: i + 1,
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
        pay: payDate.toISOString().split("T")[0],
        hours: hoursArray[i] || defaultHours,
        overtime: overtimeArray[i] || 0,
      });
      startDate.setDate(startDate.getDate() + periodLength);
    }

    return {
      totalGross,
      totalTaxes,
      netPay,
      ssTax,
      medTax,
      stateTax,
      localTax,
      stateRate: stateRates[state] || 0,
      localName: local?.name || null,
      schedule,
    };
  }, [formData]);

  return (
    <>
    
            <h1 style={{ textAlign: "center", marginBottom: "20px", fontSize:'2.25rem', fontWeight: "700" }}>
          Real Instant Paystub Generator
        </h1>
        <p style={{ color:'rgb(156 163 175)'}}>
          Create your own legit paystubs with custom specifications that pass for
          Apartments and Dealerships
        </p>
        <br />

    <Flex
      direction={{ base: "column", lg: "row" }}
      gap={8}
      align="flex-start"
      justify="space-between"
      width="100%"
      maxW="1200px"
      mx="auto"
      px="4"
    >
        
      {/* LEFT COLUMN: FORM */}
      <Box flex="1.2"
                bg="#0d0624"
          border="1px solid #8000ff"
          borderRadius="1.875rem"
          p="15px"
          minW={{ base: "100%", lg: "55%" }}>

        <form
          onSubmit={handleGenerate}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <h2>Employee Information</h2>

          <HStack gap="5" width="full">
            <Field.Root required>
              <Field.Label>
                Employee Name <Field.RequiredIndicator />
              </Field.Label>
              <Input name="name" size="lg"  css={{ "--focus-color": "purple" }} value={formData.name} onChange={handleChange} required />
            </Field.Root>
            <Field.Root required>
              <Field.Label>
                Last 4 of SSN <Field.RequiredIndicator />
              </Field.Label>
              <Input name="ssn" size="lg" value={formData.ssn} onChange={handleChange} required />
            </Field.Root>
          </HStack>

          <HStack gap="5" width="full">
            <Field.Root required>
              <Field.Label>
                Employee Address <Field.RequiredIndicator />
              </Field.Label>
              <Input name="address" size="lg" value={formData.address} onChange={handleChange} />
            </Field.Root>
            <Field.Root required>
              <Field.Label>
                Employee City <Field.RequiredIndicator />
              </Field.Label>
              <Input name="city" size="lg" value={formData.city} onChange={handleChange} />
            </Field.Root>
          </HStack>

          <HStack gap="5" width="full">
            <Field.Root required>
              <Field.Label>
                Employee State <Field.RequiredIndicator />
              </Field.Label>
              <Input name="state" size="lg" value={formData.state} onChange={handleChange} />
            </Field.Root>
            <Field.Root required>
              <Field.Label>
                Employee Zip Code <Field.RequiredIndicator />
              </Field.Label>
              <Input name="zip" size="lg" value={formData.zip} onChange={handleChange} />
            </Field.Root>
          </HStack>

          <h2>Company Information</h2>

          <HStack gap="5" width="full">
            <Field.Root required>
              <Field.Label>
                Company Name <Field.RequiredIndicator />
              </Field.Label>
              <Input name="company" size="lg" value={formData.company} onChange={handleChange} />
            </Field.Root>
            <Field.Root required>
              <Field.Label>
                Company Address <Field.RequiredIndicator />
              </Field.Label>
              <Input
                name="companyAddress"
                size="lg"
                value={formData.companyAddress}
                onChange={handleChange}
              />
            </Field.Root>
          </HStack>

          <HStack gap="5" width="full">
            <Field.Root required>
              <Field.Label>
                Company City <Field.RequiredIndicator />
              </Field.Label>
              <Input
                name="companyCity"
                size="lg"
                value={formData.companyCity}
                onChange={handleChange}
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>
                Company State <Field.RequiredIndicator />
              </Field.Label>
              <Input
                name="companyState"
                size="lg"
                value={formData.companyState}
                onChange={handleChange}
              />
            </Field.Root>
          </HStack>

          <HStack gap="5" width="full">
            <Field.Root required>
              <Field.Label>
                Company Zip Code <Field.RequiredIndicator />
              </Field.Label>
              <Input
                name="companyZip"
                size="lg"
                placeholder="Company Zip"
                value={formData.companyZip}
                onChange={handleChange}
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>
                Company Phone Number <Field.RequiredIndicator />
              </Field.Label>
              <Input
                name="companyPhone"
                size="lg"
                placeholder="Company Phone"
                value={formData.companyPhone}
                onChange={handleChange}
              />
            </Field.Root>
          </HStack>

          <HStack gap="5" width="full">
            <Field.Root required>
              <Field.Label>
                Hire Date <Field.RequiredIndicator />
              </Field.Label>
              <Input
                name="hireDate"
                size="lg"
                type="date"
                placeholder="Hire Date"
                value={formData.hireDate}
                onChange={handleChange}
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>
                Hourly Rate <Field.RequiredIndicator />
              </Field.Label>
              <Input
                name="rate"
                size="lg"
                type="number"
                value={formData.rate}
                onChange={handleChange}
              />
            </Field.Root>
          </HStack>

          <HStack gap="5" width="full">
            <Select.Root
              collection={frameworks}
              value={formData.payFrequency}
              onValueChange={handleChange}
              size="lg"
              width="320px"
            >
              <Select.HiddenSelect />
              <Select.Label>Pay Frequency</Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Pay Frequency" />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {frameworks.items.map((framework) => (
                      <Select.Item item={framework} key={framework.value}>
                        {framework.label}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>

            <label style={{ flex: 1 }}>
              Pay Day:
              <select
                name="payDay"
                value={formData.payDay}
                onChange={handleChange}
                style={{ width: "100%", marginTop: "4px" }}
              >
                <option>Monday</option>
                <option>Tuesday</option>
                <option>Wednesday</option>
                <option>Thursday</option>
                <option>Friday</option>
              </select>
            </label>
          </HStack>

          <Input
            name="numStubs"
            size="lg"
            type="number"
            placeholder="Number of Paystubs to Generate"
            value={formData.numStubs}
            onChange={handleChange}
          />
          <Input
            name="hoursList"
            size="lg"
            placeholder="Hours Worked Each Stub (comma separated)"
            value={formData.hoursList}
            onChange={handleChange}
          />
          <Input
            name="overtimeList"
            size="lg"
            placeholder="Overtime Hours Each Stub (comma separated)"
            value={formData.overtimeList}
            onChange={handleChange}
          />

          <Checkbox.Root
                        name="includeLocalTax"
                        size="lg"
              checked={formData.includeLocalTax}
      onCheckedChange={handleChange}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control />
      <Checkbox.Label>Include Local Tax if my city is in the system</Checkbox.Label>
    </Checkbox.Root>

          <Button
          variant="outline"
            type="submit"
            style={{
            }}
          >
            Submit & Download
          </Button>
        </form>
      </Box>

      {/* RIGHT COLUMN */}
      <VStack
        flex="1"
        spacing={6}
        width="full"
        position="sticky"
        top="1rem"
        align="stretch"
        maxH="calc(100vh - 2rem)"
        overflowY="auto"
        color="rgb(209 213 219)"
        p="4"
      >
        <Box
          bg="#0d0624"
          border="1px solid #8000ff"
          borderRadius="1.875rem"
          p="15px"
        >
          <h2 style={{ marginTop: 0, color: "#8000ff", fontSize:"1.5rem", fontWeight: '700' }}>Pay Preview</h2>
          <p><strong>Total Gross Pay:</strong> ${preview.totalGross.toFixed(2)}</p>
          <p><strong>Social Security (6.2%):</strong> ${preview.ssTax.toFixed(2)}</p>
          <p><strong>Medicare (1.45%):</strong> ${preview.medTax.toFixed(2)}</p>
          <p><strong>State Tax ({(preview.stateRate * 100).toFixed(2)}%):</strong> ${preview.stateTax.toFixed(2)}</p>
          {preview.localName && (
            <p><strong>{preview.localName}:</strong> ${preview.localTax.toFixed(2)}</p>
          )}
          <br />
          <hr />
          <br />
          <p style={{ color: '#ff0000ff' }}><strong>Total Taxes:</strong> ${preview.totalTaxes.toFixed(2)}</p>
          <p style={{ color: '#6eff00' }}><strong>Net Pay (After Taxes):</strong> ${preview.netPay.toFixed(2)}</p>
        </Box>

        <Box
          bg="#0d0624"
          border="1px solid #8000ff"
          borderRadius="1.875rem"
          p="15px"
        >
          <h2 style={{ marginTop: 0, color: "#8000ff", fontSize:"1.5rem", fontWeight: '700' }}>Pay Schedule Preview</h2>
          {preview.schedule.map((item) => (
            <div key={item.stub} style={{ padding: "4px 0", borderBottom: "1px solid #2d2d3a" }}>
              Stub {item.stub}. {item.start} → {item.end} | Pay Date: {item.pay} | Hours: {item.hours} | OT: {item.overtime}
            </div>
          ))}
        </Box>
      </VStack>
    </Flex>
    </>
  );
}
