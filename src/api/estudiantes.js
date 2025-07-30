import axiosClient from "./axiosClient";

const estudiantesService = {
  // GET /estudiantes/
  //   getAllEstudiantes: async () => {
  //     const response = await axiosClient.get("/estudiantes");
  //     return response.data;
  //   },

  // GET /estudiantes/EstudiantesPorProyecto/{idProyecto}
  getEstudiantesPorProyecto: async (idProyecto) => {
    const response = await axiosClient.get(
      `/estudiantes/EstudiantesPorProyecto/${idProyecto}`
    );
    return response.data;
  },

  // POST /estudiantes/
  //   crearEstudiante: async (dataEstudiante) => {
  //     const response = await axiosClient.post("/estudiantes", dataEstudiante);
  //     return response.data;
  //   },

  // GET /estudiantes/{id}
  //   getEstudiantePorId: async (id) => {
  //     const response = await axiosClient.get(`/estudiantes/${id}`);
  //     return response.data;
  //   },

  // PUT /estudiantes/{id}
  //   actualizarEstudiante: async (id, dataEstudiante) => {
  //     const response = await axiosClient.put(`/estudiantes/${id}`, dataEstudiante);
  //     return response.data;
  //   },

  // DELETE /estudiantes/{id}
  //   eliminarEstudiante: async (id) => {
  //     const response = await axiosClient.delete(`/estudiantes/${id}`);
  //     return response.data;
  //   },

  // PATCH /estudiantes/{id}
  //   actualizarParcialEstudiante: async (id, dataParcial) => {
  //     const response = await axiosClient.patch(`/estudiantes/${id}`, dataParcial);
  //     return response.data;
  //   },
};

export default estudiantesService;
