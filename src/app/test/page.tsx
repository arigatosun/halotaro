"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type GeoData = {
  city: string;
  region: string;
  country: string;
};

export default function GeolocationTestPage() {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGeoData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/geolocation");
      if (!response.ok) {
        throw new Error("Failed to fetch geolocation data");
      }
      const data = await response.json();
      setGeoData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeoData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Geolocation Test Page</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Geolocation Data</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {geoData && (
            <div>
              <p>
                <strong>City:</strong> {geoData.city}
              </p>
              <p>
                <strong>Region:</strong> {geoData.region}
              </p>
              <p>
                <strong>Country:</strong> {geoData.country}
              </p>
            </div>
          )}
          <Button onClick={fetchGeoData} className="mt-4">
            Refresh Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
