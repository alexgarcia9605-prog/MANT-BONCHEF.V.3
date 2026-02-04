from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'bonchef-mantenimiento-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Bonchef Mantenimiento API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "tecnico"  # admin, supervisor, tecnico, encargado_linea

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    location: Optional[str] = ""

class DepartmentResponse(BaseModel):
    id: str
    name: str
    description: str
    location: str
    created_at: str

# ============== PRODUCTION LINES ==============

class ProductionLineCreate(BaseModel):
    name: str
    code: str
    department_id: str
    description: Optional[str] = ""
    target_start_time: Optional[str] = ""  # Hora objetivo de arranque por defecto

class ProductionLineResponse(BaseModel):
    id: str
    name: str
    code: str
    department_id: str
    department_name: Optional[str] = ""
    description: str
    target_start_time: Optional[str] = ""
    status: str  # activa, inactiva
    created_at: str

class MachineCreate(BaseModel):
    name: str
    code: str
    department_id: str
    description: Optional[str] = ""
    brand: Optional[str] = ""
    model: Optional[str] = ""
    serial_number: Optional[str] = ""
    status: str = "operativa"  # operativa, en_mantenimiento, fuera_de_servicio

class MachineResponse(BaseModel):
    id: str
    name: str
    code: str
    department_id: str
    department_name: Optional[str] = ""
    description: str
    brand: str
    model: str
    serial_number: str
    status: str
    attachments: List[dict] = []  # Archivos adjuntos de la máquina
    created_at: str

# ============== MACHINE STOPS (PARADAS) ==============

class MachineStopCreate(BaseModel):
    machine_id: str
    stop_type: str  # averia, produccion, calidad
    reason: str  # Explicación del motivo
    start_time: str  # Hora de inicio de la parada
    end_time: Optional[str] = None  # Hora de fin (opcional)

class MachineStopResponse(BaseModel):
    id: str
    machine_id: str
    machine_name: Optional[str] = ""
    department_name: Optional[str] = ""
    stop_type: str
    reason: str
    start_time: str
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    created_by: str
    created_by_name: Optional[str] = ""
    created_at: str

# ============== MACHINE STARTS (ARRANQUES) ==============

class MachineStartCreate(BaseModel):
    production_line_id: str  # Ahora es por línea de producción
    target_time: str  # Hora objetivo de arranque
    actual_time: Optional[str] = None  # Hora real de arranque
    delay_reason: Optional[str] = None  # Razón del retraso si aplica
    date: str  # Fecha del arranque

class MachineStartResponse(BaseModel):
    id: str
    production_line_id: str
    production_line_name: Optional[str] = ""
    department_id: Optional[str] = ""
    department_name: Optional[str] = ""
    target_time: str
    actual_time: Optional[str] = None
    delay_reason: Optional[str] = ""
    date: str
    on_time: Optional[bool] = None  # Si arrancó a tiempo
    delay_minutes: Optional[int] = None  # Minutos de retraso
    created_by: str
    created_by_name: Optional[str] = ""
    created_at: str

class FileAttachment(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    data: str  # base64 encoded
    uploaded_at: str
    uploaded_by: str

class WorkOrderCreate(BaseModel):
    title: str
    description: str  # Será "observaciones" para preventivos
    type: str  # preventivo, correctivo
    priority: str = "media"  # baja, media, alta, critica
    machine_id: str
    assigned_to: Optional[str] = None
    scheduled_date: Optional[str] = None
    recurrence: Optional[str] = None  # diario, semanal, mensual, trimestral, anual
    estimated_hours: Optional[float] = None
    part_number: Optional[str] = None  # Número de parte (solo correctivos)
    # Campos específicos para correctivos
    failure_cause: Optional[str] = None  # Causa del fallo
    spare_part_used: Optional[str] = None  # Repuesto utilizado
    spare_part_reference: Optional[str] = None  # Referencia del repuesto
    # Campos específicos para preventivos
    checklist: Optional[List[dict]] = None  # Lista de items del checklist
    technician_signature: Optional[str] = None  # Firma del técnico (base64)

class WorkOrderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    scheduled_date: Optional[str] = None
    completed_date: Optional[str] = None
    notes: Optional[str] = None
    part_number: Optional[str] = None  # Número de parte
    # Campos específicos para correctivos
    failure_cause: Optional[str] = None  # Causa del fallo
    spare_part_used: Optional[str] = None  # Repuesto utilizado
    spare_part_reference: Optional[str] = None  # Referencia del repuesto
    # Campos específicos para preventivos
    checklist: Optional[List[dict]] = None  # Lista de items del checklist
    technician_signature: Optional[str] = None  # Firma del técnico
    # Campos para posponer y cierre parcial
    postponed_date: Optional[str] = None  # Nueva fecha pospuesta
    postpone_reason: Optional[str] = None  # Razón del aplazamiento
    partial_close_notes: Optional[str] = None  # Notas de cierre parcial

class WorkOrderResponse(BaseModel):
    id: str
    title: str
    description: str
    type: str
    priority: str
    status: str
    machine_id: str
    machine_name: Optional[str] = ""
    department_name: Optional[str] = ""
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = ""
    created_by: str
    created_by_name: Optional[str] = ""
    scheduled_date: Optional[str] = None
    completed_date: Optional[str] = None
    closed_date: Optional[str] = None  # Fecha de cierre automática
    recurrence: Optional[str] = None
    estimated_hours: Optional[float] = None
    part_number: Optional[str] = ""  # Número de parte (correctivos)
    failure_cause: Optional[str] = ""  # Causa del fallo
    spare_part_used: Optional[str] = ""  # Repuesto utilizado
    spare_part_reference: Optional[str] = ""  # Referencia del repuesto
    checklist: Optional[List[dict]] = []  # Checklist (preventivos)
    technician_signature: Optional[str] = ""  # Firma del técnico
    notes: Optional[str] = ""
    attachments: List[dict] = []
    history: List[dict] = []
    # Campos para posponer y cierre parcial
    postponed_date: Optional[str] = None  # Nueva fecha pospuesta
    postpone_reason: Optional[str] = ""  # Razón del aplazamiento
    partial_close_notes: Optional[str] = ""  # Notas de cierre parcial
    created_at: str
    updated_at: str

class HistoryEntry(BaseModel):
    id: str
    work_order_id: str
    action: str
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: str
    changed_by_name: str
    timestamp: str

# ============== CHECKLIST TEMPLATE MODELS ==============

class ChecklistItemCreate(BaseModel):
    name: str
    is_required: bool = True
    order: int = 0

class ChecklistTemplateCreate(BaseModel):
    name: str
    items: List[ChecklistItemCreate]

class ChecklistTemplateResponse(BaseModel):
    id: str
    name: str
    items: List[dict]
    created_at: str
    is_default: bool = False

# ============== PARADAS MODELS ==============

class StopCreate(BaseModel):
    machine_id: str
    stop_type: str  # averia, calidad, falta_medios, mantenimiento, cambio_formato, otros
    reason: str
    start_time: str
    end_time: Optional[str] = None
    notes: Optional[str] = ""

class StopUpdate(BaseModel):
    stop_type: Optional[str] = None
    reason: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None

class StopResponse(BaseModel):
    id: str
    machine_id: str
    machine_name: Optional[str] = ""
    department_name: Optional[str] = ""
    stop_type: str
    reason: str
    start_time: str
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    notes: str
    created_by: str
    created_by_name: Optional[str] = ""
    created_at: str

# ============== LINEAS Y ARRANQUE MODELS ==============

class LineCreate(BaseModel):
    name: str
    department_id: str
    target_start_time: str  # Hora objetivo de arranque (ej: "06:00")
    description: Optional[str] = ""

class LineResponse(BaseModel):
    id: str
    name: str
    department_id: str
    department_name: Optional[str] = ""
    target_start_time: str
    description: str
    created_at: str

class LineStartCreate(BaseModel):
    line_id: str
    date: str  # Fecha del arranque
    actual_start_time: str  # Hora real de arranque
    delay_reason: Optional[str] = None  # Motivo del retraso si aplica
    notes: Optional[str] = ""

class LineStartResponse(BaseModel):
    id: str
    line_id: str
    line_name: Optional[str] = ""
    department_name: Optional[str] = ""
    date: str
    target_start_time: Optional[str] = ""
    actual_start_time: str
    delay_minutes: Optional[int] = None
    delay_reason: Optional[str] = None
    on_time: bool
    notes: str
    created_by: str
    created_by_name: Optional[str] = ""
    created_at: str

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def require_role(allowed_roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Permisos insuficientes")
        return user
    return role_checker

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = create_token(user_id, user_data.email, user_data.role)
    return {"token": token, "user": {"id": user_id, "email": user_data.email, "name": user_data.name, "role": user_data.role}}

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"], created_at=user["created_at"])

# ============== USERS ENDPOINTS ==============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_role(["admin", "supervisor"]))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, user: dict = Depends(require_role(["admin"]))):
    if role not in ["admin", "supervisor", "tecnico"]:
        raise HTTPException(status_code=400, detail="Rol inválido")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Rol actualizado"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_role(["admin"]))):
    """Eliminar un usuario - Solo admin puede eliminar"""
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    # Check if user has assigned work orders
    orders = await db.work_orders.find_one({"assigned_to": user_id, "status": {"$ne": "completada"}})
    if orders:
        raise HTTPException(status_code=400, detail="No se puede eliminar: tiene órdenes de trabajo asignadas pendientes")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado"}

# ============== DEPARTMENTS ENDPOINTS ==============

@api_router.post("/departments", response_model=DepartmentResponse)
async def create_department(dept: DepartmentCreate, user: dict = Depends(require_role(["admin", "supervisor"]))):
    dept_id = str(uuid.uuid4())
    department = {
        "id": dept_id,
        "name": dept.name,
        "description": dept.description or "",
        "location": dept.location or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.departments.insert_one(department)
    return DepartmentResponse(**department)

@api_router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(user: dict = Depends(get_current_user)):
    departments = await db.departments.find({}, {"_id": 0}).to_list(1000)
    return [DepartmentResponse(**d) for d in departments]

@api_router.get("/departments/{dept_id}", response_model=DepartmentResponse)
async def get_department(dept_id: str, user: dict = Depends(get_current_user)):
    dept = await db.departments.find_one({"id": dept_id}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    return DepartmentResponse(**dept)

@api_router.put("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(dept_id: str, dept: DepartmentCreate, user: dict = Depends(require_role(["admin", "supervisor"]))):
    result = await db.departments.update_one(
        {"id": dept_id},
        {"$set": {"name": dept.name, "description": dept.description or "", "location": dept.location or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    updated = await db.departments.find_one({"id": dept_id}, {"_id": 0})
    return DepartmentResponse(**updated)

@api_router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, user: dict = Depends(require_role(["admin"]))):
    machines = await db.machines.find_one({"department_id": dept_id})
    if machines:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay máquinas asociadas")
    result = await db.departments.delete_one({"id": dept_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    return {"message": "Departamento eliminado"}

# ============== PRODUCTION LINES ==============

@api_router.post("/production-lines", response_model=ProductionLineResponse)
async def create_production_line(line: ProductionLineCreate, user: dict = Depends(require_role(["admin", "supervisor"]))):
    line_id = str(uuid.uuid4())
    prod_line = {
        "id": line_id,
        "name": line.name,
        "code": line.code,
        "department_id": line.department_id,
        "description": line.description or "",
        "target_start_time": line.target_start_time or "",
        "status": "activa",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.production_lines.insert_one(prod_line)
    
    dept = await db.departments.find_one({"id": line.department_id}, {"_id": 0})
    prod_line["department_name"] = dept["name"] if dept else ""
    return ProductionLineResponse(**prod_line)

@api_router.get("/production-lines", response_model=List[ProductionLineResponse])
async def get_production_lines(department_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"department_id": department_id} if department_id else {}
    lines = await db.production_lines.find(query, {"_id": 0}).to_list(1000)
    departments = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(1000)}
    for l in lines:
        l["department_name"] = departments.get(l["department_id"], "")
    return [ProductionLineResponse(**l) for l in lines]

@api_router.get("/production-lines/{line_id}", response_model=ProductionLineResponse)
async def get_production_line(line_id: str, user: dict = Depends(get_current_user)):
    line = await db.production_lines.find_one({"id": line_id}, {"_id": 0})
    if not line:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    dept = await db.departments.find_one({"id": line["department_id"]}, {"_id": 0})
    line["department_name"] = dept["name"] if dept else ""
    return ProductionLineResponse(**line)

@api_router.put("/production-lines/{line_id}", response_model=ProductionLineResponse)
async def update_production_line(line_id: str, line: ProductionLineCreate, user: dict = Depends(require_role(["admin", "supervisor"]))):
    result = await db.production_lines.update_one(
        {"id": line_id},
        {"$set": {
            "name": line.name,
            "code": line.code,
            "department_id": line.department_id,
            "description": line.description or "",
            "target_start_time": line.target_start_time or ""
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    updated = await db.production_lines.find_one({"id": line_id}, {"_id": 0})
    dept = await db.departments.find_one({"id": updated["department_id"]}, {"_id": 0})
    updated["department_name"] = dept["name"] if dept else ""
    return ProductionLineResponse(**updated)

@api_router.put("/production-lines/{line_id}/status")
async def toggle_production_line_status(line_id: str, user: dict = Depends(require_role(["admin", "supervisor"]))):
    line = await db.production_lines.find_one({"id": line_id}, {"_id": 0})
    if not line:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    new_status = "inactiva" if line["status"] == "activa" else "activa"
    await db.production_lines.update_one({"id": line_id}, {"$set": {"status": new_status}})
    return {"message": f"Línea {'desactivada' if new_status == 'inactiva' else 'activada'}"}

@api_router.delete("/production-lines/{line_id}")
async def delete_production_line(line_id: str, user: dict = Depends(require_role(["admin"]))):
    # Check if there are starts associated
    starts = await db.machine_starts.find_one({"production_line_id": line_id})
    if starts:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay arranques asociados")
    result = await db.production_lines.delete_one({"id": line_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    return {"message": "Línea eliminada"}

# ============== MACHINES ENDPOINTS ==============

@api_router.post("/machines", response_model=MachineResponse)
async def create_machine(machine: MachineCreate, user: dict = Depends(require_role(["admin", "supervisor"]))):
    dept = await db.departments.find_one({"id": machine.department_id}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    
    machine_id = str(uuid.uuid4())
    machine_doc = {
        "id": machine_id,
        "name": machine.name,
        "code": machine.code,
        "department_id": machine.department_id,
        "description": machine.description or "",
        "brand": machine.brand or "",
        "model": machine.model or "",
        "serial_number": machine.serial_number or "",
        "status": machine.status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.machines.insert_one(machine_doc)
    return MachineResponse(**machine_doc, department_name=dept["name"])

@api_router.get("/machines", response_model=List[MachineResponse])
async def get_machines(department_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"department_id": department_id} if department_id else {}
    machines = await db.machines.find(query, {"_id": 0}).to_list(1000)
    departments = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(1000)}
    for m in machines:
        m["department_name"] = departments.get(m["department_id"], "")
        if "attachments" not in m:
            m["attachments"] = []
    return [MachineResponse(**m) for m in machines]

@api_router.get("/machines/{machine_id}", response_model=MachineResponse)
async def get_machine(machine_id: str, user: dict = Depends(get_current_user)):
    machine = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    dept = await db.departments.find_one({"id": machine["department_id"]}, {"_id": 0})
    machine["department_name"] = dept["name"] if dept else ""
    if "attachments" not in machine:
        machine["attachments"] = []
    return MachineResponse(**machine)

@api_router.put("/machines/{machine_id}", response_model=MachineResponse)
async def update_machine(machine_id: str, machine: MachineCreate, user: dict = Depends(require_role(["admin", "supervisor"]))):
    result = await db.machines.update_one(
        {"id": machine_id},
        {"$set": {
            "name": machine.name, "code": machine.code, "department_id": machine.department_id,
            "description": machine.description or "", "brand": machine.brand or "",
            "model": machine.model or "", "serial_number": machine.serial_number or "", "status": machine.status
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    updated = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    dept = await db.departments.find_one({"id": updated["department_id"]}, {"_id": 0})
    updated["department_name"] = dept["name"] if dept else ""
    if "attachments" not in updated:
        updated["attachments"] = []
    return MachineResponse(**updated)

@api_router.delete("/machines/{machine_id}")
async def delete_machine(machine_id: str, user: dict = Depends(require_role(["admin"]))):
    orders = await db.work_orders.find_one({"machine_id": machine_id})
    if orders:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay órdenes asociadas")
    result = await db.machines.delete_one({"id": machine_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    return {"message": "Máquina eliminada"}

# ============== MACHINE ATTACHMENTS (Visible to all users) ==============

@api_router.post("/machines/{machine_id}/attachments")
async def upload_machine_attachment(
    machine_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload file attachment to a machine - accessible to all authenticated users"""
    machine = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    
    content = await file.read()
    file_id = str(uuid.uuid4())
    
    attachment = {
        "id": file_id,
        "filename": file.filename,
        "file_type": file.content_type or "application/octet-stream",
        "file_size": len(content),
        "data": base64.b64encode(content).decode("utf-8"),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": user["id"],
        "uploaded_by_name": user["name"]
    }
    
    await db.machines.update_one(
        {"id": machine_id},
        {"$push": {"attachments": attachment}}
    )
    
    return {"id": file_id, "filename": file.filename, "message": "Archivo subido exitosamente"}

@api_router.get("/machines/{machine_id}/attachments")
async def get_machine_attachments(machine_id: str, user: dict = Depends(get_current_user)):
    """Get all attachments for a machine - accessible to all authenticated users"""
    machine = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    
    attachments = machine.get("attachments", [])
    # Return without the file data for listing (lighter response)
    return [{
        "id": a["id"],
        "filename": a["filename"],
        "file_type": a["file_type"],
        "file_size": a["file_size"],
        "uploaded_at": a["uploaded_at"],
        "uploaded_by": a.get("uploaded_by", ""),
        "uploaded_by_name": a.get("uploaded_by_name", "")
    } for a in attachments]

@api_router.get("/machines/{machine_id}/attachments/{attachment_id}")
async def download_machine_attachment(machine_id: str, attachment_id: str, user: dict = Depends(get_current_user)):
    """Download a specific attachment from a machine - accessible to all authenticated users"""
    machine = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    
    attachments = machine.get("attachments", [])
    attachment = next((a for a in attachments if a["id"] == attachment_id), None)
    if not attachment:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    return attachment

@api_router.delete("/machines/{machine_id}/attachments/{attachment_id}")
async def delete_machine_attachment(machine_id: str, attachment_id: str, user: dict = Depends(get_current_user)):
    """Delete an attachment from a machine - accessible to all authenticated users"""
    machine = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    
    result = await db.machines.update_one(
        {"id": machine_id},
        {"$pull": {"attachments": {"id": attachment_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    return {"message": "Archivo eliminado"}

# ============== MACHINE STOPS (PARADAS) ==============

@api_router.post("/machine-stops", response_model=MachineStopResponse)
async def create_machine_stop(stop: MachineStopCreate, user: dict = Depends(get_current_user)):
    """Registrar una parada de máquina"""
    machine = await db.machines.find_one({"id": stop.machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    
    dept = await db.departments.find_one({"id": machine.get("department_id", "")}, {"_id": 0})
    
    stop_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate duration if end_time is provided
    duration = None
    if stop.end_time:
        try:
            start = datetime.fromisoformat(stop.start_time.replace('Z', '+00:00'))
            end = datetime.fromisoformat(stop.end_time.replace('Z', '+00:00'))
            duration = int((end - start).total_seconds() / 60)
        except:
            pass
    
    stop_doc = {
        "id": stop_id,
        "machine_id": stop.machine_id,
        "stop_type": stop.stop_type,
        "reason": stop.reason,
        "start_time": stop.start_time,
        "end_time": stop.end_time,
        "duration_minutes": duration,
        "created_by": user["id"],
        "created_at": now
    }
    
    await db.machine_stops.insert_one(stop_doc)
    
    return MachineStopResponse(
        **stop_doc,
        machine_name=machine.get("name", ""),
        department_name=dept.get("name", "") if dept else "",
        created_by_name=user["name"]
    )

@api_router.get("/machine-stops", response_model=List[MachineStopResponse])
async def get_machine_stops(
    machine_id: Optional[str] = None,
    stop_type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Obtener lista de paradas de máquinas"""
    query = {}
    if machine_id:
        query["machine_id"] = machine_id
    if stop_type:
        query["stop_type"] = stop_type
    
    stops = await db.machine_stops.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    machines = {m["id"]: m for m in await db.machines.find({}, {"_id": 0}).to_list(1000)}
    departments = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(1000)}
    users = {u["id"]: u["name"] for u in await db.users.find({}, {"_id": 0}).to_list(1000)}
    
    result = []
    for s in stops:
        machine = machines.get(s["machine_id"], {})
        s["machine_name"] = machine.get("name", "")
        s["department_name"] = departments.get(machine.get("department_id", ""), "")
        s["created_by_name"] = users.get(s.get("created_by", ""), "")
        result.append(MachineStopResponse(**s))
    
    return result

@api_router.put("/machine-stops/{stop_id}", response_model=MachineStopResponse)
async def update_machine_stop(stop_id: str, stop: MachineStopCreate, user: dict = Depends(get_current_user)):
    """Actualizar una parada (ej: añadir hora de fin)"""
    existing = await db.machine_stops.find_one({"id": stop_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Parada no encontrada")
    
    # Calculate duration
    duration = None
    if stop.end_time:
        try:
            start = datetime.fromisoformat(stop.start_time.replace('Z', '+00:00'))
            end = datetime.fromisoformat(stop.end_time.replace('Z', '+00:00'))
            duration = int((end - start).total_seconds() / 60)
        except:
            pass
    
    await db.machine_stops.update_one(
        {"id": stop_id},
        {"$set": {
            "stop_type": stop.stop_type,
            "reason": stop.reason,
            "start_time": stop.start_time,
            "end_time": stop.end_time,
            "duration_minutes": duration
        }}
    )
    
    updated = await db.machine_stops.find_one({"id": stop_id}, {"_id": 0})
    machine = await db.machines.find_one({"id": updated["machine_id"]}, {"_id": 0})
    dept = await db.departments.find_one({"id": machine.get("department_id", "")}, {"_id": 0}) if machine else None
    created_user = await db.users.find_one({"id": updated.get("created_by", "")}, {"_id": 0})
    
    return MachineStopResponse(
        **updated,
        machine_name=machine.get("name", "") if machine else "",
        department_name=dept.get("name", "") if dept else "",
        created_by_name=created_user.get("name", "") if created_user else ""
    )

@api_router.delete("/machine-stops/{stop_id}")
async def delete_machine_stop(stop_id: str, user: dict = Depends(require_role(["admin", "supervisor"]))):
    """Eliminar una parada"""
    result = await db.machine_stops.delete_one({"id": stop_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parada no encontrada")
    return {"message": "Parada eliminada"}

# ============== MACHINE STARTS (ARRANQUES) ==============

@api_router.post("/machine-starts", response_model=MachineStartResponse)
async def create_machine_start(start: MachineStartCreate, user: dict = Depends(get_current_user)):
    """Registrar un arranque de línea de producción"""
    line = await db.production_lines.find_one({"id": start.production_line_id}, {"_id": 0})
    if not line:
        raise HTTPException(status_code=404, detail="Línea de producción no encontrada")
    
    dept = await db.departments.find_one({"id": line.get("department_id", "")}, {"_id": 0})
    
    start_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate if on time and delay
    on_time = None
    delay_minutes = None
    if start.actual_time and start.target_time:
        try:
            target = datetime.strptime(start.target_time, "%H:%M")
            actual = datetime.strptime(start.actual_time, "%H:%M")
            diff = (actual - target).total_seconds() / 60
            on_time = diff <= 0
            delay_minutes = max(0, int(diff))
        except:
            pass
    
    start_doc = {
        "id": start_id,
        "production_line_id": start.production_line_id,
        "department_id": line.get("department_id", ""),
        "target_time": start.target_time,
        "actual_time": start.actual_time,
        "delay_reason": start.delay_reason or "",
        "date": start.date,
        "on_time": on_time,
        "delay_minutes": delay_minutes,
        "created_by": user["id"],
        "created_at": now
    }
    
    await db.machine_starts.insert_one(start_doc)
    
    return MachineStartResponse(
        **start_doc,
        production_line_name=line.get("name", ""),
        department_name=dept.get("name", "") if dept else "",
        created_by_name=user["name"]
    )

@api_router.get("/machine-starts", response_model=List[MachineStartResponse])
async def get_machine_starts(
    production_line_id: Optional[str] = None,
    department_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Obtener lista de arranques de líneas de producción"""
    query = {}
    if production_line_id:
        query["production_line_id"] = production_line_id
    if department_id:
        query["department_id"] = department_id
    if date_from or date_to:
        query["date"] = {}
        if date_from:
            query["date"]["$gte"] = date_from
        if date_to:
            query["date"]["$lte"] = date_to
    
    starts = await db.machine_starts.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    lines = {l["id"]: l for l in await db.production_lines.find({}, {"_id": 0}).to_list(1000)}
    departments = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(1000)}
    users = {u["id"]: u["name"] for u in await db.users.find({}, {"_id": 0}).to_list(1000)}
    
    result = []
    for s in starts:
        line = lines.get(s.get("production_line_id", ""), {})
        s["production_line_name"] = line.get("name", "")
        s["department_id"] = line.get("department_id", s.get("department_id", ""))
        s["department_name"] = departments.get(s.get("department_id", ""), "")
        s["created_by_name"] = users.get(s.get("created_by", ""), "")
        if "on_time" not in s:
            s["on_time"] = None
        if "delay_minutes" not in s:
            s["delay_minutes"] = None
        if "production_line_id" not in s:
            s["production_line_id"] = ""
        result.append(MachineStartResponse(**s))
    
    return result

@api_router.put("/machine-starts/{start_id}", response_model=MachineStartResponse)
async def update_machine_start(start_id: str, start: MachineStartCreate, user: dict = Depends(get_current_user)):
    """Actualizar un arranque (ej: añadir hora real o razón de retraso)"""
    existing = await db.machine_starts.find_one({"id": start_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Arranque no encontrado")
    
    # Calculate if on time and delay
    on_time = None
    delay_minutes = None
    if start.actual_time and start.target_time:
        try:
            target = datetime.strptime(start.target_time, "%H:%M")
            actual = datetime.strptime(start.actual_time, "%H:%M")
            diff = (actual - target).total_seconds() / 60
            on_time = diff <= 0
            delay_minutes = max(0, int(diff))
        except:
            pass
    
    await db.machine_starts.update_one(
        {"id": start_id},
        {"$set": {
            "production_line_id": start.production_line_id,
            "target_time": start.target_time,
            "actual_time": start.actual_time,
            "delay_reason": start.delay_reason or "",
            "on_time": on_time,
            "delay_minutes": delay_minutes
        }}
    )
    
    updated = await db.machine_starts.find_one({"id": start_id}, {"_id": 0})
    line = await db.production_lines.find_one({"id": updated.get("production_line_id", "")}, {"_id": 0})
    dept = await db.departments.find_one({"id": line.get("department_id", "") if line else ""}, {"_id": 0})
    created_user = await db.users.find_one({"id": updated.get("created_by", "")}, {"_id": 0})
    
    return MachineStartResponse(
        **updated,
        production_line_name=line.get("name", "") if line else "",
        department_name=dept.get("name", "") if dept else "",
        created_by_name=created_user.get("name", "") if created_user else ""
    )

@api_router.delete("/machine-starts/{start_id}")
async def delete_machine_start(start_id: str, user: dict = Depends(require_role(["admin", "supervisor"]))):
    """Eliminar un arranque"""
    result = await db.machine_starts.delete_one({"id": start_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Arranque no encontrado")
    return {"message": "Arranque eliminado"}

@api_router.get("/machine-starts/compliance-stats")
async def get_start_compliance_stats(
    department_id: Optional[str] = None,
    production_line_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Obtener estadísticas de cumplimiento de hora objetivo vs hora real"""
    query = {}
    if department_id:
        query["department_id"] = department_id
    if production_line_id:
        query["production_line_id"] = production_line_id
    if date_from or date_to:
        query["date"] = {}
        if date_from:
            query["date"]["$gte"] = date_from
        if date_to:
            query["date"]["$lte"] = date_to
    
    starts = await db.machine_starts.find(query, {"_id": 0}).to_list(10000)
    
    lines = {l["id"]: l for l in await db.production_lines.find({}, {"_id": 0}).to_list(1000)}
    departments = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(1000)}
    
    # Overall stats
    total = len(starts)
    with_actual = [s for s in starts if s.get("actual_time")]
    on_time_count = len([s for s in with_actual if s.get("on_time") == True])
    delayed_count = len([s for s in with_actual if s.get("on_time") == False])
    pending_count = total - len(with_actual)
    
    compliance_rate = (on_time_count / len(with_actual) * 100) if with_actual else 0
    
    # Stats by department
    dept_stats = {}
    for s in starts:
        line = lines.get(s.get("production_line_id", ""), {})
        dept_id = line.get("department_id", s.get("department_id", ""))
        dept_name = departments.get(dept_id, "Sin departamento")
        if dept_name not in dept_stats:
            dept_stats[dept_name] = {"total": 0, "on_time": 0, "delayed": 0, "pending": 0}
        dept_stats[dept_name]["total"] += 1
        if s.get("actual_time"):
            if s.get("on_time"):
                dept_stats[dept_name]["on_time"] += 1
            else:
                dept_stats[dept_name]["delayed"] += 1
        else:
            dept_stats[dept_name]["pending"] += 1
    
    # Stats by production line
    line_stats = {}
    for s in starts:
        line_id = s.get("production_line_id", "")
        line = lines.get(line_id, {})
        line_name = line.get("name", "Desconocida")
        if line_name not in line_stats:
            line_stats[line_name] = {"total": 0, "on_time": 0, "delayed": 0, "avg_delay": 0, "delays": []}
        line_stats[line_name]["total"] += 1
        if s.get("actual_time"):
            if s.get("on_time"):
                line_stats[line_name]["on_time"] += 1
            else:
                line_stats[line_name]["delayed"] += 1
                if s.get("delay_minutes"):
                    line_stats[line_name]["delays"].append(s["delay_minutes"])
    
    # Calculate average delays
    for name, stats in line_stats.items():
        if stats["delays"]:
            stats["avg_delay"] = sum(stats["delays"]) / len(stats["delays"])
        del stats["delays"]
    
    # Daily compliance for chart
    daily_data = {}
    for s in with_actual:
        date = s.get("date", "")
        if date not in daily_data:
            daily_data[date] = {"date": date, "on_time": 0, "delayed": 0, "total": 0}
        daily_data[date]["total"] += 1
        if s.get("on_time"):
            daily_data[date]["on_time"] += 1
        else:
            daily_data[date]["delayed"] += 1
    
    daily_chart = sorted(daily_data.values(), key=lambda x: x["date"])[-30:]  # Last 30 days
    
    return {
        "summary": {
            "total": total,
            "on_time": on_time_count,
            "delayed": delayed_count,
            "pending": pending_count,
            "compliance_rate": round(compliance_rate, 1)
        },
        "by_department": [{"department": k, **v} for k, v in dept_stats.items()],
        "by_machine": [{"machine": k, **v} for k, v in line_stats.items()],
        "daily_chart": daily_chart
    }

# ============== WORK ORDERS ENDPOINTS ==============

async def add_history(work_order_id: str, action: str, user: dict, field: str = None, old_val: str = None, new_val: str = None):
    entry = {
        "id": str(uuid.uuid4()),
        "work_order_id": work_order_id,
        "action": action,
        "field_changed": field,
        "old_value": old_val,
        "new_value": new_val,
        "changed_by": user["id"],
        "changed_by_name": user["name"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.work_order_history.insert_one(entry)

@api_router.post("/work-orders", response_model=WorkOrderResponse)
async def create_work_order(order: WorkOrderCreate, user: dict = Depends(get_current_user)):
    machine = await db.machines.find_one({"id": order.machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    
    dept = await db.departments.find_one({"id": machine["department_id"]}, {"_id": 0})
    assigned_user = None
    if order.assigned_to:
        assigned_user = await db.users.find_one({"id": order.assigned_to}, {"_id": 0})
    
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    order_doc = {
        "id": order_id,
        "title": order.title,
        "description": order.description,
        "type": order.type,
        "priority": order.priority,
        "status": "pendiente",
        "machine_id": order.machine_id,
        "assigned_to": order.assigned_to,
        "created_by": user["id"],
        "scheduled_date": order.scheduled_date,
        "completed_date": None,
        "recurrence": order.recurrence if order.type == "preventivo" else None,
        "estimated_hours": order.estimated_hours,
        "part_number": order.part_number or "" if order.type == "correctivo" else "",
        "failure_cause": order.failure_cause or "" if order.type == "correctivo" else "",
        "spare_part_used": order.spare_part_used or "" if order.type == "correctivo" else "",
        "spare_part_reference": order.spare_part_reference or "" if order.type == "correctivo" else "",
        "checklist": order.checklist or [] if order.type == "preventivo" else [],
        "technician_signature": order.technician_signature or "" if order.type == "preventivo" else "",
        "notes": "",
        "attachments": [],
        "closed_date": None,
        "created_at": now,
        "updated_at": now
    }
    await db.work_orders.insert_one(order_doc)
    await add_history(order_id, "creada", user)
    
    return WorkOrderResponse(
        **order_doc,
        machine_name=machine["name"],
        department_name=dept["name"] if dept else "",
        assigned_to_name=assigned_user["name"] if assigned_user else "",
        created_by_name=user["name"],
        history=[]
    )

@api_router.get("/work-orders", response_model=List[WorkOrderResponse])
async def get_work_orders(
    type: Optional[str] = None,
    status: Optional[str] = None,
    machine_id: Optional[str] = None,
    department_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    if machine_id:
        query["machine_id"] = machine_id
    
    if department_id:
        machines = await db.machines.find({"department_id": department_id}, {"_id": 0}).to_list(1000)
        machine_ids = [m["id"] for m in machines]
        query["machine_id"] = {"$in": machine_ids}
    
    orders = await db.work_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    machines = {m["id"]: m for m in await db.machines.find({}, {"_id": 0}).to_list(1000)}
    departments = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(1000)}
    users = {u["id"]: u["name"] for u in await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)}
    
    result = []
    for o in orders:
        machine = machines.get(o["machine_id"], {})
        o["machine_name"] = machine.get("name", "")
        o["department_name"] = departments.get(machine.get("department_id", ""), "")
        o["assigned_to_name"] = users.get(o.get("assigned_to", ""), "")
        o["created_by_name"] = users.get(o.get("created_by", ""), "")
        o["history"] = []
        # Ensure checklist and technician_signature have default values
        if "checklist" not in o:
            o["checklist"] = []
        if "technician_signature" not in o:
            o["technician_signature"] = ""
        if "closed_date" not in o:
            o["closed_date"] = None
        # Ensure postpone and partial close fields have default values
        if "postponed_date" not in o:
            o["postponed_date"] = None
        if "postpone_reason" not in o:
            o["postpone_reason"] = ""
        if "partial_close_notes" not in o:
            o["partial_close_notes"] = ""
        result.append(WorkOrderResponse(**o))
    
    return result

@api_router.get("/work-orders/{order_id}", response_model=WorkOrderResponse)
async def get_work_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.work_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    machine = await db.machines.find_one({"id": order["machine_id"]}, {"_id": 0})
    dept = await db.departments.find_one({"id": machine["department_id"]}, {"_id": 0}) if machine else None
    assigned_user = await db.users.find_one({"id": order.get("assigned_to")}, {"_id": 0}) if order.get("assigned_to") else None
    created_user = await db.users.find_one({"id": order["created_by"]}, {"_id": 0})
    
    history = await db.work_order_history.find({"work_order_id": order_id}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    
    return WorkOrderResponse(
        **order,
        machine_name=machine["name"] if machine else "",
        department_name=dept["name"] if dept else "",
        assigned_to_name=assigned_user["name"] if assigned_user else "",
        created_by_name=created_user["name"] if created_user else "",
        history=history
    )

@api_router.put("/work-orders/{order_id}", response_model=WorkOrderResponse)
async def update_work_order(order_id: str, update: WorkOrderUpdate, user: dict = Depends(get_current_user)):
    order = await db.work_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    # Check permissions for assigned technician (can only update checklist, description/observations, signature)
    is_assigned_technician = order.get("assigned_to") == user["id"] and user["role"] == "tecnico"
    is_admin_or_supervisor = user["role"] in ["admin", "supervisor"]
    
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # If user is assigned technician (not admin/supervisor), restrict fields
    if is_assigned_technician and not is_admin_or_supervisor:
        allowed_fields = ["checklist", "description", "technician_signature", "notes"]
        restricted_update = {k: v for k, v in update_dict.items() if k in allowed_fields}
        update_dict = restricted_update
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Auto-set closed_date when status changes to completada
    if update.status == "completada" and order.get("status") != "completada":
        update_dict["closed_date"] = datetime.now(timezone.utc).isoformat()
    # Clear closed_date if reopening order
    elif update.status and update.status != "completada" and order.get("status") == "completada":
        update_dict["closed_date"] = None
    
    # Track changes for history
    for field, new_value in update_dict.items():
        if field != "updated_at" and order.get(field) != new_value:
            await add_history(order_id, "actualizada", user, field, str(order.get(field, "")), str(new_value))
    
    await db.work_orders.update_one({"id": order_id}, {"$set": update_dict})
    
    # If completed and is preventivo with recurrence, create next order
    if update.status == "completada" and order["type"] == "preventivo" and order.get("recurrence"):
        await create_next_preventive(order, user)
    
    return await get_work_order(order_id, user)

async def create_next_preventive(order: dict, user: dict):
    recurrence = order.get("recurrence")
    scheduled = order.get("scheduled_date")
    
    if not scheduled or not recurrence:
        return
    
    try:
        current_date = datetime.fromisoformat(scheduled.replace("Z", "+00:00"))
    except:
        current_date = datetime.now(timezone.utc)
    
    delta_map = {
        "diario": timedelta(days=1),
        "semanal": timedelta(weeks=1),
        "mensual": timedelta(days=30),
        "trimestral": timedelta(days=90),
        "anual": timedelta(days=365)
    }
    
    next_date = current_date + delta_map.get(recurrence, timedelta(days=30))
    
    # Get default checklist for the new order (reset checked status)
    default_checklist = []
    template = await db.checklist_templates.find_one({"is_default": True}, {"_id": 0})
    if template:
        for item in template.get("items", []):
            default_checklist.append({
                "id": str(uuid.uuid4()),
                "name": item["name"],
                "is_required": item.get("is_required", True),
                "checked": False,
                "order": item.get("order", 0)
            })
    else:
        default_checklist = [
            {"id": str(uuid.uuid4()), "name": "Área o máquina recogida", "is_required": True, "checked": False, "order": 0},
            {"id": str(uuid.uuid4()), "name": "Orden y limpieza", "is_required": True, "checked": False, "order": 1}
        ]
    
    new_order = WorkOrderCreate(
        title=order["title"],
        description="",  # Clear observations for new order
        type="preventivo",
        priority=order["priority"],
        machine_id=order["machine_id"],
        assigned_to=order.get("assigned_to"),  # Keep same technician assigned
        scheduled_date=next_date.isoformat(),
        recurrence=recurrence,
        estimated_hours=order.get("estimated_hours"),
        checklist=default_checklist,
        technician_signature=""  # Clear signature for new order
    )
    await create_work_order(new_order, user)

@api_router.delete("/work-orders/{order_id}")
async def delete_work_order(order_id: str, user: dict = Depends(require_role(["admin", "supervisor"]))):
    result = await db.work_orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    await db.work_order_history.delete_many({"work_order_id": order_id})
    return {"message": "Orden eliminada"}

# ============== MY ORDERS (TECHNICIAN VIEW) ==============

@api_router.get("/my-orders")
async def get_my_orders(user: dict = Depends(get_current_user)):
    """Get orders assigned to current user, organized by type and status"""
    orders = await db.work_orders.find(
        {"assigned_to": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    machines = {m["id"]: m for m in await db.machines.find({}, {"_id": 0}).to_list(1000)}
    departments = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(1000)}
    
    # Organize by type and status
    result = {
        "preventivo": {
            "pendientes": [],
            "en_progreso": [],
            "completadas": []
        },
        "correctivo": {
            "pendientes": [],
            "en_progreso": [],
            "completadas": []
        },
        "summary": {
            "total": len(orders),
            "preventivo_pendientes": 0,
            "preventivo_completadas": 0,
            "correctivo_pendientes": 0,
            "correctivo_completadas": 0
        }
    }
    
    for o in orders:
        machine = machines.get(o["machine_id"], {})
        o["machine_name"] = machine.get("name", "")
        o["department_name"] = departments.get(machine.get("department_id", ""), "")
        if "checklist" not in o:
            o["checklist"] = []
        if "technician_signature" not in o:
            o["technician_signature"] = ""
        if "closed_date" not in o:
            o["closed_date"] = None
        
        order_type = o.get("type", "correctivo")
        status = o.get("status", "pendiente")
        
        if order_type in result:
            if status == "completada":
                result[order_type]["completadas"].append(o)
                if order_type == "preventivo":
                    result["summary"]["preventivo_completadas"] += 1
                else:
                    result["summary"]["correctivo_completadas"] += 1
            elif status == "en_progreso":
                result[order_type]["en_progreso"].append(o)
                if order_type == "preventivo":
                    result["summary"]["preventivo_pendientes"] += 1
                else:
                    result["summary"]["correctivo_pendientes"] += 1
            else:  # pendiente, cancelada
                result[order_type]["pendientes"].append(o)
                if order_type == "preventivo":
                    result["summary"]["preventivo_pendientes"] += 1
                else:
                    result["summary"]["correctivo_pendientes"] += 1
    
    return result

# ============== FILE ATTACHMENTS ==============

@api_router.post("/work-orders/{order_id}/attachments")
async def upload_attachment(
    order_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    order = await db.work_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    # Read and encode file - any file type allowed
    content = await file.read()
    file_id = str(uuid.uuid4())
    
    attachment = {
        "id": file_id,
        "filename": file.filename,
        "file_type": file.content_type or "application/octet-stream",
        "file_size": len(content),
        "data": base64.b64encode(content).decode('utf-8'),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": user["id"]
    }
    
    await db.work_orders.update_one(
        {"id": order_id},
        {"$push": {"attachments": attachment}}
    )
    await add_history(order_id, "archivo_adjunto", user, "attachment", None, file.filename)
    
    return {"id": file_id, "filename": file.filename, "file_type": file.content_type, "file_size": len(content)}

@api_router.delete("/work-orders/{order_id}/attachments/{attachment_id}")
async def delete_attachment(order_id: str, attachment_id: str, user: dict = Depends(get_current_user)):
    result = await db.work_orders.update_one(
        {"id": order_id},
        {"$pull": {"attachments": {"id": attachment_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    await add_history(order_id, "archivo_eliminado", user, "attachment", attachment_id, None)
    return {"message": "Archivo eliminado"}

# ============== PARADAS ENDPOINTS ==============

@api_router.post("/stops", response_model=StopResponse)
async def create_stop(stop: StopCreate, user: dict = Depends(get_current_user)):
    machine = await db.machines.find_one({"id": stop.machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    
    dept = await db.departments.find_one({"id": machine["department_id"]}, {"_id": 0})
    
    stop_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calcular duración si hay end_time
    duration = None
    if stop.end_time:
        try:
            start = datetime.fromisoformat(stop.start_time.replace("Z", "+00:00"))
            end = datetime.fromisoformat(stop.end_time.replace("Z", "+00:00"))
            duration = int((end - start).total_seconds() / 60)
        except:
            pass
    
    stop_doc = {
        "id": stop_id,
        "machine_id": stop.machine_id,
        "stop_type": stop.stop_type,
        "reason": stop.reason,
        "start_time": stop.start_time,
        "end_time": stop.end_time,
        "duration_minutes": duration,
        "notes": stop.notes or "",
        "created_by": user["id"],
        "created_at": now
    }
    await db.stops.insert_one(stop_doc)
    
    return StopResponse(
        **stop_doc,
        machine_name=machine["name"],
        department_name=dept["name"] if dept else "",
        created_by_name=user["name"]
    )

@api_router.get("/stops", response_model=List[StopResponse])
async def get_stops(
    machine_id: Optional[str] = None,
    stop_type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if machine_id:
        query["machine_id"] = machine_id
    if stop_type:
        query["stop_type"] = stop_type
    
    stops = await db.stops.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    machines = {m["id"]: m for m in await db.machines.find({}, {"_id": 0}).to_list(1000)}
    departments = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(1000)}
    users = {u["id"]: u["name"] for u in await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)}
    
    result = []
    for s in stops:
        machine = machines.get(s["machine_id"], {})
        s["machine_name"] = machine.get("name", "")
        s["department_name"] = departments.get(machine.get("department_id", ""), "")
        s["created_by_name"] = users.get(s.get("created_by", ""), "")
        result.append(StopResponse(**s))
    
    return result

@api_router.put("/stops/{stop_id}", response_model=StopResponse)
async def update_stop(stop_id: str, update: StopUpdate, user: dict = Depends(get_current_user)):
    stop = await db.stops.find_one({"id": stop_id}, {"_id": 0})
    if not stop:
        raise HTTPException(status_code=404, detail="Parada no encontrada")
    
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Recalcular duración si se actualiza end_time
    if "end_time" in update_dict and update_dict["end_time"]:
        try:
            start = datetime.fromisoformat(stop["start_time"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(update_dict["end_time"].replace("Z", "+00:00"))
            update_dict["duration_minutes"] = int((end - start).total_seconds() / 60)
        except:
            pass
    
    await db.stops.update_one({"id": stop_id}, {"$set": update_dict})
    
    updated = await db.stops.find_one({"id": stop_id}, {"_id": 0})
    machine = await db.machines.find_one({"id": updated["machine_id"]}, {"_id": 0})
    dept = await db.departments.find_one({"id": machine["department_id"]}, {"_id": 0}) if machine else None
    creator = await db.users.find_one({"id": updated["created_by"]}, {"_id": 0})
    
    return StopResponse(
        **updated,
        machine_name=machine["name"] if machine else "",
        department_name=dept["name"] if dept else "",
        created_by_name=creator["name"] if creator else ""
    )

@api_router.delete("/stops/{stop_id}")
async def delete_stop(stop_id: str, user: dict = Depends(require_role(["admin", "supervisor"]))):
    result = await db.stops.delete_one({"id": stop_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parada no encontrada")
    return {"message": "Parada eliminada"}

# ============== LINEAS ENDPOINTS ==============

@api_router.post("/lines", response_model=LineResponse)
async def create_line(line: LineCreate, user: dict = Depends(require_role(["admin", "supervisor"]))):
    dept = await db.departments.find_one({"id": line.department_id}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    
    line_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    line_doc = {
        "id": line_id,
        "name": line.name,
        "department_id": line.department_id,
        "target_start_time": line.target_start_time,
        "description": line.description or "",
        "created_at": now
    }
    await db.lines.insert_one(line_doc)
    
    return LineResponse(**line_doc, department_name=dept["name"])

@api_router.get("/lines", response_model=List[LineResponse])
async def get_lines(user: dict = Depends(get_current_user)):
    lines = await db.lines.find({}, {"_id": 0}).to_list(1000)
    departments = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(1000)}
    
    for line in lines:
        line["department_name"] = departments.get(line["department_id"], "")
    
    return [LineResponse(**l) for l in lines]

@api_router.delete("/lines/{line_id}")
async def delete_line(line_id: str, user: dict = Depends(require_role(["admin"]))):
    result = await db.lines.delete_one({"id": line_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    return {"message": "Línea eliminada"}

# ============== ARRANQUE DE LINEAS ENDPOINTS ==============

@api_router.post("/line-starts", response_model=LineStartResponse)
async def create_line_start(start: LineStartCreate, user: dict = Depends(get_current_user)):
    line = await db.lines.find_one({"id": start.line_id}, {"_id": 0})
    if not line:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    
    dept = await db.departments.find_one({"id": line["department_id"]}, {"_id": 0})
    
    start_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calcular retraso
    delay_minutes = 0
    on_time = True
    try:
        target = datetime.strptime(line["target_start_time"], "%H:%M")
        actual = datetime.strptime(start.actual_start_time, "%H:%M")
        diff = (actual - target).total_seconds() / 60
        delay_minutes = int(diff) if diff > 0 else 0
        on_time = delay_minutes <= 0
    except:
        pass
    
    start_doc = {
        "id": start_id,
        "line_id": start.line_id,
        "date": start.date,
        "actual_start_time": start.actual_start_time,
        "delay_minutes": delay_minutes,
        "delay_reason": start.delay_reason if delay_minutes > 0 else None,
        "on_time": on_time,
        "notes": start.notes or "",
        "created_by": user["id"],
        "created_at": now
    }
    await db.line_starts.insert_one(start_doc)
    
    return LineStartResponse(
        **start_doc,
        line_name=line["name"],
        department_name=dept["name"] if dept else "",
        target_start_time=line["target_start_time"],
        created_by_name=user["name"]
    )

@api_router.get("/line-starts", response_model=List[LineStartResponse])
async def get_line_starts(
    line_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if line_id:
        query["line_id"] = line_id
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    starts = await db.line_starts.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    lines = {l["id"]: l for l in await db.lines.find({}, {"_id": 0}).to_list(1000)}
    departments = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(1000)}
    users = {u["id"]: u["name"] for u in await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)}
    
    result = []
    for s in starts:
        line = lines.get(s["line_id"], {})
        s["line_name"] = line.get("name", "")
        s["target_start_time"] = line.get("target_start_time", "")
        s["department_name"] = departments.get(line.get("department_id", ""), "")
        s["created_by_name"] = users.get(s.get("created_by", ""), "")
        result.append(LineStartResponse(**s))
    
    return result

@api_router.delete("/line-starts/{start_id}")
async def delete_line_start(start_id: str, user: dict = Depends(require_role(["admin", "supervisor"]))):
    result = await db.line_starts.delete_one({"id": start_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return {"message": "Registro eliminado"}

# ============== DASHBOARD STATS ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    total_machines = await db.machines.count_documents({})
    operational = await db.machines.count_documents({"status": "operativa"})
    in_maintenance = await db.machines.count_documents({"status": "en_mantenimiento"})
    out_of_service = await db.machines.count_documents({"status": "fuera_de_servicio"})
    
    total_orders = await db.work_orders.count_documents({})
    pending = await db.work_orders.count_documents({"status": "pendiente"})
    in_progress = await db.work_orders.count_documents({"status": "en_progreso"})
    completed = await db.work_orders.count_documents({"status": "completada"})
    
    preventive = await db.work_orders.count_documents({"type": "preventivo"})
    corrective = await db.work_orders.count_documents({"type": "correctivo"})
    
    # Orders by priority
    critical = await db.work_orders.count_documents({"priority": "critica", "status": {"$ne": "completada"}})
    high = await db.work_orders.count_documents({"priority": "alta", "status": {"$ne": "completada"}})
    
    return {
        "machines": {
            "total": total_machines,
            "operational": operational,
            "in_maintenance": in_maintenance,
            "out_of_service": out_of_service
        },
        "orders": {
            "total": total_orders,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "preventive": preventive,
            "corrective": corrective,
            "critical": critical,
            "high_priority": high
        }
    }

@api_router.get("/dashboard/recent-orders")
async def get_recent_orders(limit: int = 5, user: dict = Depends(get_current_user)):
    orders = await db.work_orders.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    machines = {m["id"]: m["name"] for m in await db.machines.find({}, {"_id": 0}).to_list(1000)}
    
    for o in orders:
        o["machine_name"] = machines.get(o["machine_id"], "")
    
    return orders

# ============== CHECKLIST TEMPLATES ENDPOINTS ==============

@api_router.get("/checklist-templates", response_model=List[ChecklistTemplateResponse])
async def get_checklist_templates(user: dict = Depends(get_current_user)):
    templates = await db.checklist_templates.find({}, {"_id": 0}).to_list(100)
    if not templates:
        # Create default template if none exists
        default_template = {
            "id": str(uuid.uuid4()),
            "name": "Plantilla por Defecto",
            "is_default": True,
            "items": [
                {"id": str(uuid.uuid4()), "name": "Área o máquina recogida", "is_required": True, "order": 0},
                {"id": str(uuid.uuid4()), "name": "Orden y limpieza", "is_required": True, "order": 1}
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.checklist_templates.insert_one(default_template)
        templates = [default_template]
    return [ChecklistTemplateResponse(**t) for t in templates]

@api_router.post("/checklist-templates", response_model=ChecklistTemplateResponse)
async def create_checklist_template(template: ChecklistTemplateCreate, user: dict = Depends(require_role(["admin", "supervisor"]))):
    template_id = str(uuid.uuid4())
    items_with_ids = []
    for i, item in enumerate(template.items):
        items_with_ids.append({
            "id": str(uuid.uuid4()),
            "name": item.name,
            "is_required": item.is_required,
            "order": item.order if item.order else i
        })
    
    template_doc = {
        "id": template_id,
        "name": template.name,
        "items": items_with_ids,
        "is_default": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.checklist_templates.insert_one(template_doc)
    return ChecklistTemplateResponse(**template_doc)

@api_router.put("/checklist-templates/{template_id}", response_model=ChecklistTemplateResponse)
async def update_checklist_template(template_id: str, template: ChecklistTemplateCreate, user: dict = Depends(require_role(["admin", "supervisor"]))):
    existing = await db.checklist_templates.find_one({"id": template_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    items_with_ids = []
    for i, item in enumerate(template.items):
        items_with_ids.append({
            "id": str(uuid.uuid4()),
            "name": item.name,
            "is_required": item.is_required,
            "order": item.order if item.order else i
        })
    
    await db.checklist_templates.update_one(
        {"id": template_id},
        {"$set": {"name": template.name, "items": items_with_ids}}
    )
    updated = await db.checklist_templates.find_one({"id": template_id}, {"_id": 0})
    return ChecklistTemplateResponse(**updated)

@api_router.delete("/checklist-templates/{template_id}")
async def delete_checklist_template(template_id: str, user: dict = Depends(require_role(["admin"]))):
    template = await db.checklist_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    if template.get("is_default"):
        raise HTTPException(status_code=400, detail="No se puede eliminar la plantilla por defecto")
    
    result = await db.checklist_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return {"message": "Plantilla eliminada"}

@api_router.get("/checklist-templates/default")
async def get_default_checklist(user: dict = Depends(get_current_user)):
    """Get default checklist items for new preventive orders"""
    template = await db.checklist_templates.find_one({"is_default": True}, {"_id": 0})
    if not template:
        # Create default if not exists
        default_items = [
            {"id": str(uuid.uuid4()), "name": "Área o máquina recogida", "is_required": True, "checked": False, "order": 0},
            {"id": str(uuid.uuid4()), "name": "Orden y limpieza", "is_required": True, "checked": False, "order": 1}
        ]
        default_template = {
            "id": str(uuid.uuid4()),
            "name": "Plantilla por Defecto",
            "is_default": True,
            "items": default_items,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.checklist_templates.insert_one(default_template)
        return default_items
    
    # Return items with checked field for use in work orders
    return [{"id": str(uuid.uuid4()), "name": item["name"], "is_required": item.get("is_required", True), "checked": False, "order": item.get("order", i)} for i, item in enumerate(template.get("items", []))]

@api_router.get("/dashboard/calendar")
async def get_calendar_events(user: dict = Depends(get_current_user)):
    orders = await db.work_orders.find(
        {"scheduled_date": {"$ne": None}},
        {"_id": 0}
    ).to_list(1000)
    
    machines = {m["id"]: m["name"] for m in await db.machines.find({}, {"_id": 0}).to_list(1000)}
    
    events = []
    for o in orders:
        events.append({
            "id": o["id"],
            "title": o["title"],
            "date": o["scheduled_date"],
            "type": o["type"],
            "status": o["status"],
            "priority": o["priority"],
            "machine_name": machines.get(o["machine_id"], "")
        })
    
    return events

# ============== ANALYTICS ==============

@api_router.get("/analytics/preventive-vs-corrective")
async def get_preventive_vs_corrective(user: dict = Depends(get_current_user)):
    """Comparativa mensual de órdenes preventivas vs correctivas"""
    orders = await db.work_orders.find({}, {"_id": 0, "type": 1, "created_at": 1}).to_list(10000)
    
    # Agrupar por mes
    monthly_data = {}
    for order in orders:
        try:
            date = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00"))
            month_key = date.strftime("%Y-%m")
            month_label = date.strftime("%b %Y")
        except:
            continue
        
        if month_key not in monthly_data:
            monthly_data[month_key] = {"month": month_label, "preventivo": 0, "correctivo": 0}
        
        if order["type"] == "preventivo":
            monthly_data[month_key]["preventivo"] += 1
        else:
            monthly_data[month_key]["correctivo"] += 1
    
    # Ordenar por fecha y devolver últimos 12 meses
    sorted_data = sorted(monthly_data.items(), key=lambda x: x[0])[-12:]
    return [v for k, v in sorted_data]

@api_router.get("/analytics/failure-causes")
async def get_failure_causes(user: dict = Depends(get_current_user)):
    """Causas de fallo más frecuentes en correctivos"""
    orders = await db.work_orders.find(
        {"type": "correctivo", "failure_cause": {"$ne": "", "$exists": True}},
        {"_id": 0, "failure_cause": 1}
    ).to_list(10000)
    
    # Contar causas
    cause_counts = {}
    cause_labels = {
        "accidente": "Accidente",
        "mala_utilizacion": "Mala utilización",
        "instruccion_no_respetada": "Instrucción no respetada",
        "mala_intervencion_anterior": "Mala intervención anterior",
        "fatiga_acumulada": "Fatiga acumulada",
        "golpe": "Golpe",
        "diseno_inadecuado": "Diseño inadecuado",
        "desgaste": "Desgaste",
        "mal_montaje": "Mal montaje",
        "corrosion": "Corrosión",
        "otros": "Otros"
    }
    
    for order in orders:
        cause = order.get("failure_cause", "")
        if cause:
            label = cause_labels.get(cause, cause)
            cause_counts[label] = cause_counts.get(label, 0) + 1
    
    # Convertir a lista ordenada
    result = [{"causa": k, "cantidad": v} for k, v in cause_counts.items()]
    result.sort(key=lambda x: x["cantidad"], reverse=True)
    return result

@api_router.get("/analytics/recurring-correctives")
async def get_recurring_correctives(user: dict = Depends(get_current_user)):
    """Correctivos más repetidos por máquina basándose en la descripción de la avería"""
    # Get all corrective orders with description
    orders = await db.work_orders.find(
        {"type": "correctivo"},
        {"_id": 0, "machine_id": 1, "title": 1, "description": 1, "failure_cause": 1, "created_at": 1}
    ).to_list(10000)
    
    # Get machines and departments
    machines = {m["id"]: m for m in await db.machines.find({}, {"_id": 0}).to_list(1000)}
    departments = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(1000)}
    
    # Group by machine and analyze descriptions
    machine_issues = {}  # {machine_id: {issue_key: {count, descriptions, titles}}}
    
    for order in orders:
        machine_id = order.get("machine_id")
        if not machine_id:
            continue
            
        machine = machines.get(machine_id, {})
        machine_name = machine.get("name", "Desconocida")
        dept_name = departments.get(machine.get("department_id", ""), "")
        
        if machine_id not in machine_issues:
            machine_issues[machine_id] = {
                "machine_name": machine_name,
                "department_name": dept_name,
                "issues": {}
            }
        
        # Create issue key from description (simplified - first 50 chars lowercase)
        description = order.get("description", "").strip()
        title = order.get("title", "").strip()
        
        # Use title as primary grouping if description is empty
        issue_text = description if description else title
        if not issue_text:
            continue
            
        # Normalize for grouping (lowercase, remove extra spaces)
        issue_key = " ".join(issue_text.lower().split())[:100]
        
        if issue_key not in machine_issues[machine_id]["issues"]:
            machine_issues[machine_id]["issues"][issue_key] = {
                "count": 0,
                "sample_title": title,
                "sample_description": description[:200] if description else "",
                "failure_cause": order.get("failure_cause", ""),
                "dates": []
            }
        
        machine_issues[machine_id]["issues"][issue_key]["count"] += 1
        if order.get("created_at"):
            machine_issues[machine_id]["issues"][issue_key]["dates"].append(order["created_at"])
    
    # Build result - only include machines with recurring issues (count > 1)
    result = {
        "machines_with_recurring": [],
        "top_recurring_issues": [],
        "summary": {
            "total_machines_analyzed": len(machine_issues),
            "machines_with_recurring_issues": 0,
            "total_recurring_issues": 0
        }
    }
    
    all_issues = []
    
    for machine_id, data in machine_issues.items():
        recurring = []
        for issue_key, issue_data in data["issues"].items():
            if issue_data["count"] > 1:  # Only recurring (more than once)
                recurring.append({
                    "description": issue_data["sample_description"] or issue_data["sample_title"],
                    "title": issue_data["sample_title"],
                    "count": issue_data["count"],
                    "failure_cause": issue_data["failure_cause"],
                    "first_occurrence": min(issue_data["dates"]) if issue_data["dates"] else None,
                    "last_occurrence": max(issue_data["dates"]) if issue_data["dates"] else None
                })
                all_issues.append({
                    "machine_name": data["machine_name"],
                    "department_name": data["department_name"],
                    "description": issue_data["sample_description"] or issue_data["sample_title"],
                    "count": issue_data["count"]
                })
        
        if recurring:
            recurring.sort(key=lambda x: x["count"], reverse=True)
            result["machines_with_recurring"].append({
                "machine_id": machine_id,
                "machine_name": data["machine_name"],
                "department_name": data["department_name"],
                "recurring_issues": recurring[:5],  # Top 5 per machine
                "total_recurring": len(recurring)
            })
            result["summary"]["machines_with_recurring_issues"] += 1
            result["summary"]["total_recurring_issues"] += len(recurring)
    
    # Sort machines by number of recurring issues
    result["machines_with_recurring"].sort(key=lambda x: x["total_recurring"], reverse=True)
    
    # Top 10 recurring issues across all machines
    all_issues.sort(key=lambda x: x["count"], reverse=True)
    result["top_recurring_issues"] = all_issues[:10]
    
    return result

@api_router.get("/analytics/preventive-compliance")
async def get_preventive_compliance(user: dict = Depends(get_current_user)):
    """Cumplimiento de preventivos: a tiempo vs atrasados"""
    orders = await db.work_orders.find(
        {"type": "preventivo"},
        {"_id": 0, "status": 1, "scheduled_date": 1, "completed_date": 1, "created_at": 1}
    ).to_list(10000)
    
    now = datetime.now(timezone.utc)
    
    # Contadores generales
    total = len(orders)
    completed_on_time = 0
    completed_late = 0
    pending_on_time = 0
    pending_late = 0
    no_date = 0
    
    # Datos mensuales para gráfica de tendencia
    monthly_data = {}
    
    for order in orders:
        scheduled = order.get("scheduled_date")
        completed = order.get("completed_date")
        status = order.get("status", "pendiente")
        
        if not scheduled:
            no_date += 1
            continue
        
        try:
            scheduled_str = scheduled.replace("Z", "+00:00")
            if "+" not in scheduled_str and "T" in scheduled_str:
                scheduled_str = scheduled_str + "+00:00"
            elif "T" not in scheduled_str:
                scheduled_str = scheduled_str + "T00:00:00+00:00"
            scheduled_dt = datetime.fromisoformat(scheduled_str)
            if scheduled_dt.tzinfo is None:
                scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
            month_key = scheduled_dt.strftime("%Y-%m")
            month_label = scheduled_dt.strftime("%b %Y")
        except:
            no_date += 1
            continue
        
        if month_key not in monthly_data:
            monthly_data[month_key] = {"month": month_label, "a_tiempo": 0, "atrasado": 0}
        
        if status == "completada":
            if completed:
                try:
                    completed_dt = datetime.fromisoformat(completed.replace("Z", "+00:00"))
                    if completed_dt <= scheduled_dt:
                        completed_on_time += 1
                        monthly_data[month_key]["a_tiempo"] += 1
                    else:
                        completed_late += 1
                        monthly_data[month_key]["atrasado"] += 1
                except:
                    completed_on_time += 1
                    monthly_data[month_key]["a_tiempo"] += 1
            else:
                completed_on_time += 1
                monthly_data[month_key]["a_tiempo"] += 1
        else:
            if scheduled_dt < now:
                pending_late += 1
                monthly_data[month_key]["atrasado"] += 1
            else:
                pending_on_time += 1
                monthly_data[month_key]["a_tiempo"] += 1
    
    # Calcular porcentaje de cumplimiento
    total_with_date = total - no_date
    on_time_total = completed_on_time + pending_on_time
    compliance_rate = round((on_time_total / total_with_date * 100), 1) if total_with_date > 0 else 0
    
    # Ordenar datos mensuales
    sorted_monthly = sorted(monthly_data.items(), key=lambda x: x[0])[-12:]
    
    return {
        "summary": {
            "total": total,
            "completed_on_time": completed_on_time,
            "completed_late": completed_late,
            "pending_on_time": pending_on_time,
            "pending_late": pending_late,
            "compliance_rate": compliance_rate
        },
        "pie_data": [
            {"name": "A tiempo", "value": on_time_total, "color": "#22c55e"},
            {"name": "Atrasado", "value": completed_late + pending_late, "color": "#ef4444"}
        ],
        "monthly": [v for k, v in sorted_monthly]
    }

@api_router.get("/analytics/stops")
async def get_stops_analytics(user: dict = Depends(get_current_user)):
    """Análisis de paradas por tipo"""
    stops = await db.stops.find({}, {"_id": 0}).to_list(10000)
    
    type_labels = {
        "averia": "Avería",
        "calidad": "Calidad",
        "falta_medios": "Falta de medios",
        "mantenimiento": "Mantenimiento",
        "cambio_formato": "Cambio de formato",
        "otros": "Otros"
    }
    
    # Contar por tipo
    type_counts = {}
    total_duration = 0
    type_duration = {}
    
    for stop in stops:
        stop_type = stop.get("stop_type", "otros")
        label = type_labels.get(stop_type, stop_type)
        type_counts[label] = type_counts.get(label, 0) + 1
        
        duration = stop.get("duration_minutes", 0) or 0
        total_duration += duration
        type_duration[label] = type_duration.get(label, 0) + duration
    
    # Por tipo (cantidad)
    by_type = [{"tipo": k, "cantidad": v} for k, v in type_counts.items()]
    by_type.sort(key=lambda x: x["cantidad"], reverse=True)
    
    # Por duración
    by_duration = [{"tipo": k, "minutos": v, "horas": round(v/60, 1)} for k, v in type_duration.items()]
    by_duration.sort(key=lambda x: x["minutos"], reverse=True)
    
    # Por día de la semana
    daily_data = {i: 0 for i in range(7)}
    day_names = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    
    for stop in stops:
        try:
            start_str = stop.get("start_time", "")
            if start_str:
                start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                daily_data[start_dt.weekday()] += 1
        except:
            pass
    
    by_day = [{"dia": day_names[i], "cantidad": daily_data[i]} for i in range(7)]
    
    return {
        "total": len(stops),
        "total_duration_hours": round(total_duration / 60, 1),
        "by_type": by_type,
        "by_duration": by_duration,
        "by_day": by_day
    }

@api_router.get("/analytics/line-starts")
async def get_line_starts_analytics(user: dict = Depends(get_current_user)):
    """Análisis de cumplimiento de arranque de líneas"""
    starts = await db.line_starts.find({}, {"_id": 0}).to_list(10000)
    lines = {l["id"]: l for l in await db.lines.find({}, {"_id": 0}).to_list(1000)}
    
    total = len(starts)
    on_time_count = sum(1 for s in starts if s.get("on_time", False))
    late_count = total - on_time_count
    compliance_rate = round((on_time_count / total * 100), 1) if total > 0 else 0
    
    # Por línea
    line_stats = {}
    for s in starts:
        line_id = s.get("line_id")
        line = lines.get(line_id, {})
        line_name = line.get("name", "Desconocida")
        
        if line_name not in line_stats:
            line_stats[line_name] = {"total": 0, "on_time": 0, "late": 0, "total_delay": 0}
        
        line_stats[line_name]["total"] += 1
        if s.get("on_time", False):
            line_stats[line_name]["on_time"] += 1
        else:
            line_stats[line_name]["late"] += 1
            line_stats[line_name]["total_delay"] += s.get("delay_minutes", 0) or 0
    
    by_line = []
    for name, stats in line_stats.items():
        rate = round((stats["on_time"] / stats["total"] * 100), 1) if stats["total"] > 0 else 0
        by_line.append({
            "linea": name,
            "total": stats["total"],
            "a_tiempo": stats["on_time"],
            "tarde": stats["late"],
            "cumplimiento": rate,
            "retraso_total_min": stats["total_delay"]
        })
    
    by_line.sort(key=lambda x: x["cumplimiento"], reverse=True)
    
    # Por motivo de retraso
    delay_reasons = {}
    for s in starts:
        reason = s.get("delay_reason")
        if reason and not s.get("on_time", True):
            delay_reasons[reason] = delay_reasons.get(reason, 0) + 1
    
    by_reason = [{"motivo": k, "cantidad": v} for k, v in delay_reasons.items()]
    by_reason.sort(key=lambda x: x["cantidad"], reverse=True)
    
    # Tendencia diaria (últimos 30 registros)
    daily_trend = []
    for s in sorted(starts, key=lambda x: x.get("date", ""))[-30:]:
        daily_trend.append({
            "fecha": s.get("date", ""),
            "retraso": s.get("delay_minutes", 0) or 0,
            "a_tiempo": 1 if s.get("on_time", False) else 0
        })
    
    return {
        "summary": {
            "total": total,
            "on_time": on_time_count,
            "late": late_count,
            "compliance_rate": compliance_rate
        },
        "pie_data": [
            {"name": "A tiempo", "value": on_time_count, "color": "#22c55e"},
            {"name": "Con retraso", "value": late_count, "color": "#ef4444"}
        ],
        "by_line": by_line,
        "by_reason": by_reason,
        "daily_trend": daily_trend
    }

# ============== HEALTH CHECK ==============

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and configure CORS
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
