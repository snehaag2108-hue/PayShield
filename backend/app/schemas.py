from pydantic import BaseModel, Field

class TransactionInput(BaseModel):
    transaction_id: str | None = None
    amount: float = Field(default=500, ge=0, le=10_000_000)
    hour: int = Field(default=14, ge=0, le=23)
    device_new: bool = False
    velocity_5m: int = Field(default=1, ge=0, le=1000)
    geo_deviation: float = Field(default=0.0, ge=0, le=1)
    customer_avg_amount: float = Field(default=500, ge=0, le=10_000_000)
    anomaly_score: float | None = Field(default=None, ge=0, le=1)

class PolicyUpdate(BaseModel):
    friction_budget: int = Field(default=2, ge=1, le=3)
    step_up_cost: float = Field(default=8, ge=0)
    false_block_cost: float = Field(default=40, ge=0)
    verification_success_rate: float = Field(default=0.85, ge=0, le=1)
