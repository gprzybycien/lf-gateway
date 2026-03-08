app.post("/run", async (req, res) => {
  const received = (req.header("x-api-key") || "").trim().replace(/:$/, "");
  if (received !== GATEWAY_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { query, session_id } = req.body || {};

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing required field: query" });
  }

  console.log("Incoming query:", query);

  const url =
    `${DATASTAX_LANGFLOW_URL}/lf/${LANGFLOW_TENANT_ID}/api/v1/run/${FLOW_ID}?stream=false`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${APPLICATION_TOKEN}`,
        "X-DataStax-Current-Org": ASTRA_ORG_ID
      },
      body: JSON.stringify({
        input_value: query,
        input_type: "chat",
        output_type: "chat",
        ...(session_id ? { session_id } : {})
      })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log("Langflow status:", response.status);
    console.log("Langflow response:", text);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Langflow API error",
        status: response.status,
        response: data
      });
    }

    const answer =
      data?.outputs?.[0]?.outputs?.[0]?.results?.message?.text ??
      data?.outputs?.[0]?.outputs?.[0]?.results?.message ??
      "";

    return res.json({
      answer,
      raw: data
    });
  } catch (err) {
    return res.status(500).json({
      error: "Gateway failure",
      details: String(err)
    });
  }
});
