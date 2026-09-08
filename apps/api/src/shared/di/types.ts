// Repositorios de Dominio (Repositories)
export const TYPES = {
  // ============ REPOSITORIOS EXISTENTES ============
  IUserRepository: Symbol("IUserRepository"),
  IRefreshTokenRepository: Symbol("IRefreshTokenRepository"),

  // ============ SERVICIOS DE APLICACIÓN ============
  AuthService: Symbol("AuthService"),
  UserService: Symbol("UserService"),

  // ============ CONTROLADORES ============
  AuthController: Symbol("AuthController"),
  UserController: Symbol("UserController"),

  // ============ NUEVOS MÓDULOS (AGREGAR AQUÍ) ============

  // Repositorios de Dominio - Animal Module
  IAnimalRepository: Symbol("IAnimalRepository"),

  // Repositorios de Dominio - Breeding Module
  IBreedingRepository: Symbol("IBreedingRepository"),

  // Repositorios de Dominio - Health Module
  IHealthRecordRepository: Symbol("IHealthRecordRepository"),

  // Repositorios de Dominio - Production Module
  IProductionRecordRepository: Symbol("IProductionRecordRepository"),

  // Repositorios de Dominio - Sync Module
  ISyncRepository: Symbol("ISyncRepository"),

  // Repositorios de Dominio - Species Module
  ISpeciesRepository: Symbol("ISpeciesRepository"),

  // Servicios de Aplicación - Animal Module
  AnimalService: Symbol("AnimalService"),

  // Servicios de Aplicación - Breeding Module
  BreedingService: Symbol("BreedingService"),

  // Servicios de Aplicación - Health Module
  HealthRecordService: Symbol("HealthRecordService"),

  // Servicios de Aplicación - Production Module
  ProductionRecordService: Symbol("ProductionRecordService"),

  // Servicios de Aplicación - Sync Module
  SyncService: Symbol("SyncService"),

  // Servicios de Aplicación - Species Module
  SpeciesService: Symbol("SpeciesService"),

  // Controladores - Animal Module
  AnimalController: Symbol("AnimalController"),

  // Controladores - Breeding Module
  BreedingController: Symbol("BreedingController"),

  // Controladores - Health Module
  HealthRecordController: Symbol("HealthRecordController"),

  // Controladores - Production Module
  ProductionRecordController: Symbol("ProductionRecordController"),

  // Controladores - Sync Module
  SyncController: Symbol("SyncController"),

  // Controladores - Species Module
  SpeciesController: Symbol("SpeciesController"),

  // ============ MÁS MÓDULOS FUTUROS ============
  // Agrega aquí según vas creando nuevos módulos
  // InvoiceRepository, CustomerRepository, etc.
} as const;
